import { randomUUID } from 'crypto';
import { Session, SessionConfig, SessionStatus, AgentType, getAgentCategory } from '../../shared/types';

// node-pty is a native module - use require
const pty = require('node-pty');

const isWindows = process.platform === 'win32';
const OUTPUT_BUFFER_SIZE = 50 * 1024; // 50KB

type OutputCallback = (sessionId: string, data: string) => void;
type StatusCallback = (session: Session) => void;

interface ManagedSession {
  session: Session;
  ptyProcess: any;
  outputBuffer: string;
}

const TERMINAL_COMMANDS: Partial<Record<AgentType, string>> = {
  shell: isWindows ? 'powershell.exe' : 'bash',
  claude: 'claude',
  clawbot: 'clawbot',
  opencode: 'opencode',
  codex: 'codex',
};

const TERMINAL_DEFAULT_ARGS: Partial<Record<AgentType, string[]>> = {
  shell: isWindows ? ['-NoLogo'] : [],
};

// Validate that a string does not contain shell metacharacters
function sanitizeShellArg(arg: string): string {
  // Strip characters commonly used for shell injection
  return arg.replace(/[;&|`$(){}!<>\n\r]/g, '');
}

function getAgentCommandAndArgs(
  agentType: AgentType,
  customCommand?: string,
  flags?: string
): { cmd: string; args: string[] } {
  let cmd: string;
  let args: string[] = [];

  if (agentType === 'custom' && customCommand) {
    // Split custom command into executable + args safely
    const parts = customCommand.trim().split(/\s+/);
    cmd = sanitizeShellArg(parts[0]);
    args = parts.slice(1).map(sanitizeShellArg);
  } else {
    cmd = TERMINAL_COMMANDS[agentType] || 'bash';
    args = TERMINAL_DEFAULT_ARGS[agentType] ? [...TERMINAL_DEFAULT_ARGS[agentType]!] : [];
  }

  if (flags) {
    const flagArgs = flags.trim().split(/\s+/).map(sanitizeShellArg).filter(Boolean);
    args.push(...flagArgs);
  }

  return { cmd, args };
}

export class SessionManager {
  private sessions: Map<string, ManagedSession> = new Map();
  private onOutput: OutputCallback | null = null;
  private onStatusChange: StatusCallback | null = null;

  setOutputHandler(handler: OutputCallback): void {
    this.onOutput = handler;
  }

  setStatusHandler(handler: StatusCallback): void {
    this.onStatusChange = handler;
  }

  createSession(config: SessionConfig): Session {
    const id = randomUUID();
    const category = config.category || getAgentCategory(config.agentType);

    // Validate CWD - use home directory if invalid
    const cwd = config.cwd || process.env.HOME || process.env.USERPROFILE || '.';
    const validatedCwd = cwd;

    // Team agents are virtual - no PTY process
    if (category === 'team') {
      return this.createVirtualSession(id, config, category);
    }

    const { cmd, args } = getAgentCommandAndArgs(config.agentType, config.customCommand, config.flags);

    let ptyProcess: any;
    try {
      ptyProcess = pty.spawn(cmd, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: validatedCwd,
        env: process.env,
      });
    } catch (err: any) {
      console.error(`PTY spawn failed for ${config.name}:`, err?.message || err);
      const session: Session = {
        id,
        name: config.name,
        agentType: config.agentType,
        location: config.location,
        sshHost: config.sshHost,
        cwd: config.cwd,
        status: 'offline',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        customCommand: config.customCommand,
        flags: config.flags,
        category: 'terminal',
      };
      const managed: ManagedSession = { session, ptyProcess: null, outputBuffer: '' };
      this.sessions.set(id, managed);
      this.emitStatusChange(session);
      return session;
    }

    const session: Session = {
      id,
      name: config.name,
      agentType: config.agentType,
      location: config.location,
      sshHost: config.sshHost,
      cwd: config.cwd,
      status: 'idle',
      pid: ptyProcess.pid,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      customCommand: config.customCommand,
      flags: config.flags,
      category: 'terminal',
    };

    const managed: ManagedSession = {
      session,
      ptyProcess,
      outputBuffer: '',
    };

    ptyProcess.onData((data: string) => {
      managed.outputBuffer = (managed.outputBuffer + data).slice(-OUTPUT_BUFFER_SIZE);
      managed.session.lastActivity = Date.now();
      if (this.onOutput) {
        this.onOutput(id, data);
      }
    });

    ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      managed.session.status = 'offline';
      managed.ptyProcess = null;
      this.emitStatusChange(managed.session);
    });

    this.sessions.set(id, managed);
    this.emitStatusChange(session);
    return session;
  }

  private createVirtualSession(id: string, config: SessionConfig, category: 'terminal' | 'team'): Session {
    const session: Session = {
      id,
      name: config.name,
      agentType: config.agentType,
      location: config.location,
      cwd: config.cwd,
      status: 'idle',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      category,
    };

    const managed: ManagedSession = {
      session,
      ptyProcess: null,
      outputBuffer: '',
    };

    this.sessions.set(id, managed);
    this.emitStatusChange(session);
    return session;
  }

  sendInput(id: string, text: string): boolean {
    const managed = this.sessions.get(id);
    if (!managed?.ptyProcess) return false;
    managed.ptyProcess.write(text);
    managed.session.lastActivity = Date.now();
    return true;
  }

  resizePTY(id: string, cols: number, rows: number): boolean {
    const managed = this.sessions.get(id);
    if (!managed?.ptyProcess) return false;
    try {
      managed.ptyProcess.resize(cols, rows);
      return true;
    } catch {
      return false;
    }
  }

  killSession(id: string): boolean {
    const managed = this.sessions.get(id);
    if (!managed) return false;
    if (managed.ptyProcess) {
      try {
        managed.ptyProcess.kill();
      } catch {
        // Process may already be dead
      }
    }
    managed.session.status = 'offline';
    this.emitStatusChange(managed.session);
    return true;
  }

  restartSession(id: string): Session | null {
    const managed = this.sessions.get(id);
    if (!managed) return null;

    const config: SessionConfig = {
      name: managed.session.name,
      agentType: managed.session.agentType,
      location: managed.session.location,
      sshHost: managed.session.sshHost,
      cwd: managed.session.cwd,
      customCommand: managed.session.customCommand,
      flags: managed.session.flags,
    };

    this.killSession(id);
    this.sessions.delete(id);

    return this.createSession(config);
  }

  removeSession(id: string): boolean {
    this.killSession(id);
    return this.sessions.delete(id);
  }

  getSession(id: string): Session | null {
    return this.sessions.get(id)?.session ?? null;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).map(m => m.session);
  }

  getOutputBuffer(id: string): string {
    return this.sessions.get(id)?.outputBuffer ?? '';
  }

  updateSessionStatus(id: string, status: SessionStatus): void {
    const managed = this.sessions.get(id);
    if (!managed) return;
    managed.session.status = status;
    this.emitStatusChange(managed.session);
  }

  restoreSession(session: Session): void {
    session.status = 'offline';
    session.pid = undefined;
    const managed: ManagedSession = {
      session,
      ptyProcess: null,
      outputBuffer: '',
    };
    this.sessions.set(session.id, managed);
  }

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.killSession(id);
    }
  }

  private emitStatusChange(session: Session): void {
    if (this.onStatusChange) {
      this.onStatusChange(session);
    }
  }
}
