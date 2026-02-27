import { execFile } from 'child_process';
import { promisify } from 'util';
import type { NodeId, NodeInfo, AgentType, DetectedAgent } from '../../shared/types';
import { NODE_CONFIG } from '../../shared/types';
import type { ConfigManager } from './ConfigManager';

const execFileAsync = promisify(execFile);

// Poll every 8 seconds (lighter than node monitor's 30s)
const POLL_INTERVAL = 8_000;
const SSH_TIMEOUT = 6_000;

// Patterns to match agent process command lines
const AGENT_PATTERNS: { pattern: RegExp; agentType: AgentType }[] = [
  { pattern: /@anthropic-ai\/claude-code|claude-code\/dist|\.claude\/|claude\.js/i, agentType: 'claude' },
  { pattern: /opencode/i, agentType: 'opencode' },
  { pattern: /codex/i, agentType: 'codex' },
  { pattern: /clawbot/i, agentType: 'clawbot' },
];

function detectAgentType(cmdline: string): AgentType | null {
  for (const { pattern, agentType } of AGENT_PATTERNS) {
    if (pattern.test(cmdline)) return agentType;
  }
  return null;
}

// Windows process output format: "<pid>\t<commandline>"
function parseWindowsProcessList(output: string, nodeId: NodeId): DetectedAgent[] {
  const agents: DetectedAgent[] = [];
  const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const tabIdx = line.indexOf('\t');
    if (tabIdx <= 0) continue;

    const pid = line.slice(0, tabIdx).trim();
    const cmdline = line.slice(tabIdx + 1).trim();
    const agentType = detectAgentType(cmdline);
    if (!agentType) continue;

    const cwdMatch = cmdline.match(/--cwd[= ]([^\s"]+)/);
    agents.push({
      pid,
      agentType,
      nodeId,
      cwd: cwdMatch?.[1],
      startedAt: Date.now(),
    });
  }
  return agents;
}

// Linux ps aux output: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND...
function parseLinuxPs(output: string, nodeId: NodeId): DetectedAgent[] {
  const agents: DetectedAgent[] = [];
  const lines = output.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[1];
    const cmdline = parts.slice(10).join(' ');
    const agentType = detectAgentType(cmdline);
    if (!agentType) continue;
    agents.push({ pid, agentType, nodeId, startedAt: Date.now() });
  }
  return agents;
}

type AgentUpdateHandler = (nodeId: NodeId, agents: DetectedAgent[]) => void;

export class ProcessWatcherManager {
  private agentMap: Map<NodeId, DetectedAgent[]> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private onUpdate: AgentUpdateHandler | null = null;
  private configManager: ConfigManager;
  // Track PIDs seen this session to preserve startedAt time
  private pidTimestamps: Map<string, number> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    for (const node of NODE_CONFIG) {
      this.agentMap.set(node.id, []);
    }
  }

  setUpdateHandler(handler: AgentUpdateHandler): void {
    this.onUpdate = handler;
  }

  getAgents(nodeId: NodeId): DetectedAgent[] {
    return this.agentMap.get(nodeId) ?? [];
  }

  getAllAgentsFlat(): DetectedAgent[] {
    return Array.from(this.agentMap.values()).flat();
  }

  start(): void {
    this.pollAll();
    this.pollTimer = setInterval(() => this.pollAll(), POLL_INTERVAL);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private getLocalNodeId(): NodeId {
    return this.configManager.getSettings().localNodeId || 'pc1';
  }

  async pollAll(): Promise<void> {
    const localId = this.getLocalNodeId();
    await Promise.allSettled(
      NODE_CONFIG.map((node) => {
        if (node.id === localId) return this.pollLocal(node);
        if (node.monitorType === 'ssh-linux') return this.pollSSHLinux(node);
        return this.pollSSHWindows(node);
      })
    );
  }

  private updateNode(nodeId: NodeId, freshAgents: DetectedAgent[]): void {
    const previous = this.agentMap.get(nodeId) ?? [];

    // Preserve original startedAt for known PIDs
    const updated = freshAgents.map((agent) => {
      const key = `${nodeId}:${agent.pid}`;
      const knownStart = this.pidTimestamps.get(key);
      if (knownStart) return { ...agent, startedAt: knownStart };
      this.pidTimestamps.set(key, agent.startedAt);
      return agent;
    });

    // Clean up dead PIDs from timestamp map
    const activePidKeys = new Set(updated.map((a) => `${nodeId}:${a.pid}`));
    for (const key of this.pidTimestamps.keys()) {
      if (key.startsWith(`${nodeId}:`) && !activePidKeys.has(key)) {
        this.pidTimestamps.delete(key);
      }
    }

    // Only notify if agent list actually changed
    const prevSig = previous.map((a) => `${a.pid}:${a.agentType}`).sort().join(',');
    const nextSig = updated.map((a) => `${a.pid}:${a.agentType}`).sort().join(',');
    if (prevSig !== nextSig) {
      this.agentMap.set(nodeId, updated);
      this.onUpdate?.(nodeId, updated);
    }
  }

  private async pollLocal(node: NodeInfo): Promise<void> {
    try {
      if (process.platform === 'win32') {
        const result = await execFileAsync('powershell', [
          '-NoProfile',
          '-NonInteractive',
          '-EncodedCommand',
          this.encodePowerShell(this.getWindowsProcessScript()),
        ], { timeout: 5000, maxBuffer: 256 * 1024 });

        this.updateNode(node.id, parseWindowsProcessList(result.stdout, node.id));
        return;
      }

      const result = await execFileAsync('bash', [
        '-lc',
        "ps aux --no-headers | grep -E '(claude|opencode|codex|clawbot)' | grep -v grep || true",
      ], { timeout: 5000, maxBuffer: 256 * 1024 });

      this.updateNode(node.id, parseLinuxPs(result.stdout, node.id));
    } catch {
      this.updateNode(node.id, []);
    }
  }

  private async pollSSHWindows(node: NodeInfo): Promise<void> {
    try {
      const result = await this.runSSHCommand(
        node,
        `powershell -NoProfile -NonInteractive -EncodedCommand ${this.encodePowerShell(this.getWindowsProcessScript())}`,
        SSH_TIMEOUT,
        256 * 1024,
      );

      this.updateNode(node.id, parseWindowsProcessList(result.stdout, node.id));
    } catch {
      this.updateNode(node.id, []);
    }
  }

  private async pollSSHLinux(node: NodeInfo): Promise<void> {
    try {
      const result = await this.runSSHCommand(
        node,
        "ps aux --no-headers | grep -E '(claude|opencode|codex|clawbot)' | grep -v grep || true",
        SSH_TIMEOUT,
        128 * 1024,
      );

      this.updateNode(node.id, parseLinuxPs(result.stdout, node.id));
    } catch {
      this.updateNode(node.id, []);
    }
  }

  private resolveSshTarget(node: NodeInfo): string | null {
    if (node.sshAlias) return node.sshAlias;
    const host = node.tailscaleIp || (node.ip && node.ip !== 'localhost' ? node.ip : node.hostname);
    if (!host) return null;
    return node.user ? `${node.user}@${host}` : host;
  }

  private async runSSHCommand(
    node: NodeInfo,
    command: string,
    timeout: number,
    maxBuffer: number,
  ): Promise<{ stdout: string; stderr: string }> {
    const target = this.resolveSshTarget(node);
    if (!target) throw new Error(`No SSH target for node: ${node.id}`);
    return execFileAsync('ssh', [
      '-o', 'ConnectTimeout=5',
      '-o', 'BatchMode=yes',
      target,
      command,
    ], { timeout, maxBuffer });
  }

  private encodePowerShell(script: string): string {
    return Buffer.from(script, 'utf16le').toString('base64');
  }

  private getWindowsProcessScript(): string {
    return [
      'Get-CimInstance Win32_Process',
      "| Where-Object { $_.Name -in @('node.exe','claude.exe','opencode.exe') -and $_.CommandLine }",
      '| ForEach-Object {',
      "  $cmd = $_.CommandLine -replace '\\r?\\n', ' '",
      '  Write-Output ("{0}`t{1}" -f $_.ProcessId, $cmd)',
      '}',
    ].join(' ');
  }
}
