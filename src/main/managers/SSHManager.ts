import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { Client, ConnectConfig } from 'ssh2';
import SSHConfig from 'ssh-config';
import { SSHHost, SessionConfig, Session } from '../../shared/types';
import { ConfigManager } from './ConfigManager';

type OutputCallback = (sessionId: string, data: string) => void;
type StatusCallback = (session: Session) => void;

interface RemoteSession {
  session: Session;
  client: Client;
  stream: any;
  outputBuffer: string;
}

export class SSHManager {
  private configManager: ConfigManager;
  private remoteSessions: Map<string, RemoteSession> = new Map();
  private onOutput: OutputCallback | null = null;
  private onStatusChange: StatusCallback | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  setOutputHandler(handler: OutputCallback): void {
    this.onOutput = handler;
  }

  setStatusHandler(handler: StatusCallback): void {
    this.onStatusChange = handler;
  }

  parseSSHConfig(): SSHHost[] {
    const configPath = join(homedir(), '.ssh', 'config');
    if (!existsSync(configPath)) return [];

    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = SSHConfig.parse(content);
      const hosts: SSHHost[] = [];

      for (const section of parsed) {
        const s = section as any;
        if (s.type !== 1) continue; // 1 = Host directive
        const hostPattern = s.value as string;
        if (!hostPattern || hostPattern.includes('*')) continue;

        const getParam = (name: string): string | undefined => {
          if (!s.config) return undefined;
          for (const item of s.config) {
            if (item?.param?.toLowerCase() === name.toLowerCase()) {
              return item.value as string;
            }
          }
          return undefined;
        };

        hosts.push({
          id: `ssh-config-${hostPattern}`,
          name: hostPattern,
          hostname: getParam('HostName') || hostPattern,
          port: parseInt(getParam('Port') || '22', 10),
          username: getParam('User') || '',
          identityFile: getParam('IdentityFile'),
          isManual: false,
        });
      }
      return hosts;
    } catch {
      return [];
    }
  }

  addManualHost(config: Omit<SSHHost, 'id' | 'isManual'>): SSHHost {
    const host: SSHHost = {
      ...config,
      id: randomUUID(),
      isManual: true,
    };
    const settings = this.configManager.getSettings();
    settings.sshHosts.push(host);
    this.configManager.setSettings({ sshHosts: settings.sshHosts });
    return host;
  }

  removeHost(id: string): boolean {
    const settings = this.configManager.getSettings();
    const before = settings.sshHosts.length;
    settings.sshHosts = settings.sshHosts.filter(h => h.id !== id);
    if (settings.sshHosts.length < before) {
      this.configManager.setSettings({ sshHosts: settings.sshHosts });
      return true;
    }
    return false;
  }

  getAllHosts(): SSHHost[] {
    const configHosts = this.parseSSHConfig();
    const manualHosts = this.configManager.getSetting('sshHosts');
    return [...configHosts, ...manualHosts];
  }

  async connect(host: SSHHost): Promise<Client> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      const connectConfig: ConnectConfig = {
        host: host.hostname,
        port: host.port,
        username: host.username,
      };

      if (host.identityFile) {
        const keyPath = host.identityFile.replace(/^~/, homedir());
        if (existsSync(keyPath)) {
          connectConfig.privateKey = readFileSync(keyPath);
        }
      }

      client.on('ready', () => resolve(client));
      client.on('error', (err) => reject(err));
      client.connect(connectConfig);
    });
  }

  async createRemoteSession(host: SSHHost, config: SessionConfig): Promise<Session> {
    const client = await this.connect(host);
    const id = randomUUID();

    const session: Session = {
      id,
      name: config.name,
      agentType: config.agentType,
      location: 'remote',
      sshHost: host.id,
      cwd: config.cwd,
      status: 'idle',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      customCommand: config.customCommand,
      flags: config.flags,
    };

    return new Promise((resolve, reject) => {
      client.shell((err, stream) => {
        if (err) {
          client.end();
          reject(err);
          return;
        }

        const remote: RemoteSession = {
          session,
          client,
          stream,
          outputBuffer: '',
        };

        // Build the agent command with sanitization
        const baseCommands: Record<string, string> = {
          claude: 'claude -c',
          clawbot: 'clawbot',
          opencode: 'opencode',
          codex: 'codex',
          custom: config.customCommand || 'bash',
        };
        let cmd = baseCommands[config.agentType] || 'bash';
        if (config.flags) {
          const safeFlags = config.flags.replace(/[;&|`$(){}!<>\n\r]/g, '');
          cmd += ' ' + safeFlags;
        }

        // Sanitize cwd to prevent injection via directory names
        const safeCwd = config.cwd.replace(/[;&|`$(){}!<>\n\r]/g, '');

        // cd to working directory and run command
        stream.write(`cd "${safeCwd}" && ${cmd}\n`);

        stream.on('data', (data: Buffer) => {
          const text = data.toString();
          remote.outputBuffer = (remote.outputBuffer + text).slice(-50 * 1024);
          remote.session.lastActivity = Date.now();
          if (this.onOutput) {
            this.onOutput(id, text);
          }
        });

        stream.on('close', () => {
          remote.session.status = 'offline';
          client.end();
          if (this.onStatusChange) {
            this.onStatusChange(remote.session);
          }
        });

        this.remoteSessions.set(id, remote);
        resolve(session);
      });
    });
  }

  sendInput(id: string, text: string): boolean {
    const remote = this.remoteSessions.get(id);
    if (!remote?.stream) return false;
    remote.stream.write(text);
    remote.session.lastActivity = Date.now();
    return true;
  }

  killRemoteSession(id: string): boolean {
    const remote = this.remoteSessions.get(id);
    if (!remote) return false;
    try {
      remote.stream?.close();
      remote.client?.end();
    } catch {
      // Already closed
    }
    remote.session.status = 'offline';
    this.remoteSessions.delete(id);
    if (this.onStatusChange) {
      this.onStatusChange(remote.session);
    }
    return true;
  }

  getOutputBuffer(id: string): string {
    return this.remoteSessions.get(id)?.outputBuffer ?? '';
  }

  getSession(id: string): Session | null {
    return this.remoteSessions.get(id)?.session ?? null;
  }

  async testConnection(host: SSHHost): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.connect(host);
      client.end();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  destroyAll(): void {
    for (const [id] of this.remoteSessions) {
      this.killRemoteSession(id);
    }
  }
}
