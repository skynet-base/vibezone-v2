import { execFile } from 'child_process';
import { promisify } from 'util';
import type { NodeId, NodeStatus, NodeCommandResult, NodeInfo } from '../../shared/types';
import { NODE_CONFIG } from '../../shared/types';
import type { ConfigManager } from './ConfigManager';

const execFileAsync = promisify(execFile);

const POLL_INTERVAL = 30_000;
const SSH_TIMEOUT = 10_000;

type StatusHandler = (statuses: NodeStatus[]) => void;

export class NodeMonitorManager {
  private statuses: Map<NodeId, NodeStatus> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private statusHandler: StatusHandler | null = null;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    for (const node of NODE_CONFIG) {
      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'offline',
        lastChecked: 0,
      });
    }
  }

  setStatusHandler(handler: StatusHandler): void {
    this.statusHandler = handler;
  }

  private emit(): void {
    if (this.statusHandler) {
      this.statusHandler(this.getAllStatuses());
    }
  }

  getAllStatuses(): NodeStatus[] {
    return Array.from(this.statuses.values());
  }

  private getLocalNodeId(): NodeId {
    return this.configManager.getSettings().localNodeId || 'pc1';
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

  async pollAll(): Promise<void> {
    const localId = this.getLocalNodeId();
    await Promise.allSettled(
      NODE_CONFIG.map((node) => {
        if (node.id === localId) return this.pollLocal(node);
        switch (node.monitorType) {
          case 'ssh-windows': return this.pollSSHWindows(node);
          case 'ssh-linux': return this.pollSSHLinux(node);
          default: return this.pollSSHWindows(node);
        }
      })
    );
    await this.pollGGAgentStatusAll();
    this.emit();
  }

  async refreshNode(nodeId: NodeId): Promise<NodeStatus> {
    const node = NODE_CONFIG.find(n => n.id === nodeId);
    if (!node) throw new Error(`Unknown node: ${nodeId}`);
    const localId = this.getLocalNodeId();
    if (nodeId === localId) {
      await this.pollLocal(node);
    } else if (node.monitorType === 'ssh-linux') {
      await this.pollSSHLinux(node);
    } else {
      await this.pollSSHWindows(node);
    }
    this.emit();
    return this.statuses.get(nodeId)!;
  }

  async executeCommand(nodeId: NodeId, command: string): Promise<NodeCommandResult> {
    const timestamp = Date.now();
    try {
      let output: string;
      const exitCode = 0;
      const localId = this.getLocalNodeId();

      if (nodeId === localId) {
        const result = await this.runLocalCommand(command, SSH_TIMEOUT, 1024 * 1024);
        output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
      } else {
        const node = NODE_CONFIG.find(n => n.id === nodeId);
        if (!node) throw new Error(`Unknown node: ${nodeId}`);
        const result = await this.runSSHCommand(node, command, SSH_TIMEOUT, 1024 * 1024);
        output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
      }

      return { nodeId, command, output: output.trim(), exitCode, timestamp };
    } catch (err: any) {
      return {
        nodeId,
        command,
        output: err.stderr || err.message || 'Command failed',
        exitCode: err.code || 1,
        timestamp,
      };
    }
  }

  // ---- Local Machine ----
  private async pollLocal(node: NodeInfo): Promise<void> {
    try {
      const osModule = await import('os');
      const totalMB = Math.round(osModule.totalmem() / 1024 / 1024);
      const freeMB = Math.round(osModule.freemem() / 1024 / 1024);
      const usedMB = totalMB - freeMB;
      const uptimeSeconds = osModule.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);

      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'online',
        lastChecked: Date.now(),
        ram: { totalMB, usedMB },
        uptime: `${days}g ${hours}sa`,
        services: [
          { name: 'VibeZone', status: 'running' },
          { name: 'Claude Code', status: 'running' },
        ],
      });
    } catch {
      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'online',
        lastChecked: Date.now(),
      });
    }
  }

  // ---- Remote Windows via SSH ----
  private async pollSSHWindows(node: NodeInfo): Promise<void> {
    try {
      this.updateConnection(node.id, 'connecting');

      const result = await this.runSSHCommand(
        node,
        `powershell -NoProfile -NonInteractive -EncodedCommand ${this.encodePowerShell(this.getWindowsStatusScript())}`,
        SSH_TIMEOUT,
        512 * 1024,
      );
      const parsed = this.parseWindowsStatusOutput(result.stdout);

      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'online',
        lastChecked: Date.now(),
        ram: { totalMB: parsed.totalMB, usedMB: parsed.usedMB },
        uptime: parsed.uptime,
        services: [
          { name: 'SSH Server', status: 'running' },
        ],
      });
    } catch (err: any) {
      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'offline',
        lastChecked: Date.now(),
        error: err.message?.slice(0, 100),
      });
    }
  }

  // ---- Remote Linux via SSH ----
  private async pollSSHLinux(node: NodeInfo): Promise<void> {
    try {
      this.updateConnection(node.id, 'connecting');

      const result = await this.runSSHCommand(
        node,
        'bash /root/orchestration-status.sh 2>/dev/null || echo \'{"error":"script_missing"}\'',
        SSH_TIMEOUT,
        512 * 1024,
      );

      const data = JSON.parse(result.stdout.trim());

      if (data.error) {
        this.statuses.set(node.id, {
          nodeId: node.id,
          connection: 'online',
          lastChecked: Date.now(),
          error: data.error,
        });
        return;
      }

      const services: NodeStatus['services'] = [];
      if (data.openclaw) {
        services.push({
          name: 'OpenClaw Gateway',
          status: data.openclaw.status === 'running' ? 'running' : 'stopped',
          pid: data.openclaw.pid,
          memPercent: data.openclaw.mem_percent,
        });
      }
      if (data.chrome_processes > 0) {
        services.push({
          name: `Chrome (${data.chrome_processes} proc)`,
          status: 'running',
        });
      }

      const cronJobs: NodeStatus['cronJobs'] = (data.cron_jobs || []).map((j: any) => ({
        name: j.name,
        enabled: true,
        lastStatus: j.status,
        errors: j.errors,
      }));

      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'online',
        lastChecked: Date.now(),
        ram: data.ram ? { totalMB: data.ram.total_mb, usedMB: data.ram.used_mb } : undefined,
        disk: data.disk_percent ? { totalGB: 48, usedPercent: data.disk_percent } : undefined,
        uptime: data.uptime,
        services,
        cronJobs,
      });
    } catch (err: any) {
      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'offline',
        lastChecked: Date.now(),
        error: err.message?.slice(0, 100),
      });
    }
  }

  // ---- GG Agent Status (all nodes) ----
  private async pollGGAgentStatusAll(): Promise<void> {
    const ggLinuxCmd = this.getLinuxGGIdentityCommand();
    const ggWindowsEncoded = this.encodePowerShell(this.getWindowsGGIdentityScript());
    const localId = this.getLocalNodeId();

    for (const node of NODE_CONFIG) {
      const status = this.statuses.get(node.id);
      if (!status || (node.id !== localId && status.connection !== 'online')) {
        if (status) status.gg_agent_status = undefined;
        continue;
      }

      try {
        let result: { stdout: string; stderr: string };
        const isLocal = node.id === localId;
        const isWindowsNode = isLocal ? process.platform === 'win32' : node.monitorType === 'ssh-windows';

        if (node.id === localId) {
          if (isWindowsNode) {
            result = await execFileAsync('powershell', [
              '-NoProfile',
              '-NonInteractive',
              '-EncodedCommand',
              ggWindowsEncoded,
            ], { timeout: 5000, maxBuffer: 64 * 1024 });
          } else {
            result = await execFileAsync('bash', ['-lc', ggLinuxCmd], {
              timeout: 5000,
              maxBuffer: 64 * 1024,
            });
          }
        } else {
          if (isWindowsNode) {
            result = await this.runSSHCommand(
              node,
              `powershell -NoProfile -NonInteractive -EncodedCommand ${ggWindowsEncoded}`,
              8000,
              64 * 1024,
            );
          } else {
            result = await this.runSSHCommand(
              node,
              ggLinuxCmd,
              8000,
              64 * 1024,
            );
          }
        }

        const data = this.tryParseJson(result.stdout);
        if (data.pc_id || node.id === localId) {
          status.gg_agent_status = {
            pc_id: data.pc_id || node.id,
            platform: data.platform || 'claude-code',
            active_tasks: 0,
            autonomous_cron: data.autonomous_cron || false,
          };
        } else {
          status.gg_agent_status = undefined;
        }
      } catch {
        status.gg_agent_status = undefined;
      }
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
      '-o', 'ConnectTimeout=8',
      '-o', 'BatchMode=yes',
      target,
      command,
    ], { timeout, maxBuffer });
  }

  private async runLocalCommand(
    command: string,
    timeout: number,
    maxBuffer: number,
  ): Promise<{ stdout: string; stderr: string }> {
    if (process.platform === 'win32') {
      return execFileAsync('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        this.encodePowerShell(command),
      ], { timeout, maxBuffer });
    }
    return execFileAsync('bash', ['-lc', command], { timeout, maxBuffer });
  }

  private encodePowerShell(script: string): string {
    return Buffer.from(script, 'utf16le').toString('base64');
  }

  private getWindowsStatusScript(): string {
    return [
      '$os = Get-CimInstance Win32_OperatingSystem',
      '$total = [int][math]::Round($os.TotalVisibleMemorySize / 1024)',
      '$free = [int][math]::Round($os.FreePhysicalMemory / 1024)',
      '$used = $total - $free',
      '$boot = $os.LastBootUpTime',
      'if (-not ($boot -is [datetime])) { $boot = [System.Management.ManagementDateTimeConverter]::ToDateTime($boot) }',
      '$uptime = New-TimeSpan -Start $boot -End (Get-Date)',
      'Write-Output ("TOTAL_MB={0}" -f $total)',
      'Write-Output ("USED_MB={0}" -f $used)',
      'Write-Output ("UPTIME_DAYS={0}" -f [int]$uptime.TotalDays)',
      'Write-Output ("UPTIME_HOURS={0}" -f $uptime.Hours)',
    ].join('; ');
  }

  private parseWindowsStatusOutput(output: string): { totalMB: number; usedMB: number; uptime: string } {
    const totalMB = parseInt(output.match(/TOTAL_MB=(\d+)/)?.[1] || '0', 10);
    const usedMB = parseInt(output.match(/USED_MB=(\d+)/)?.[1] || '0', 10);
    const days = parseInt(output.match(/UPTIME_DAYS=(\d+)/)?.[1] || '0', 10);
    const hours = parseInt(output.match(/UPTIME_HOURS=(\d+)/)?.[1] || '0', 10);
    return {
      totalMB,
      usedMB,
      uptime: `${days}g ${hours}sa`,
    };
  }

  private getLinuxGGIdentityCommand(): string {
    return [
      'GG_TOOLS=""',
      'if [ -f "$HOME/.claude/good-guys/bin/gg-tools.cjs" ]; then GG_TOOLS="$HOME/.claude/good-guys/bin/gg-tools.cjs"; fi',
      'if [ -z "$GG_TOOLS" ] && [ -f "$HOME/.claude/bin/gg-tools.cjs" ]; then GG_TOOLS="$HOME/.claude/bin/gg-tools.cjs"; fi',
      'if [ -z "$GG_TOOLS" ] && [ -f "$HOME/.openclaw/good-guys/bin/gg-tools.cjs" ]; then GG_TOOLS="$HOME/.openclaw/good-guys/bin/gg-tools.cjs"; fi',
      'if [ -z "$GG_TOOLS" ]; then echo "{}"; else node "$GG_TOOLS" pc-identity 2>/dev/null || echo "{}"; fi',
    ].join('; ');
  }

  private getWindowsGGIdentityScript(): string {
    return [
      '$paths = @(',
      '  "$HOME\\.claude\\good-guys\\bin\\gg-tools.cjs",',
      '  "$HOME\\.claude\\bin\\gg-tools.cjs",',
      '  "$HOME\\.openclaw\\good-guys\\bin\\gg-tools.cjs"',
      ')',
      '$tool = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1',
      'if (-not $tool) { Write-Output "{}"; exit 0 }',
      'node $tool pc-identity 2>$null',
    ].join('; ');
  }

  private tryParseJson(raw: string): any {
    const text = raw.trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(text.slice(start, end + 1));
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  private updateConnection(nodeId: NodeId, status: NodeStatus['connection']): void {
    const current = this.statuses.get(nodeId);
    if (current) {
      current.connection = status;
      this.emit();
    }
  }
}
