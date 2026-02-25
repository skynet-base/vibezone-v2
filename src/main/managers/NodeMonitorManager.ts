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
        const result = await execFileAsync('bash', ['-c', command], {
          timeout: SSH_TIMEOUT,
          maxBuffer: 1024 * 1024,
        });
        output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
      } else {
        const node = NODE_CONFIG.find(n => n.id === nodeId);
        if (!node?.sshAlias) throw new Error(`No SSH alias for node: ${nodeId}`);
        const result = await execFileAsync('ssh', [
          '-o', 'ConnectTimeout=8',
          '-o', 'BatchMode=yes',
          node.sshAlias,
          command,
        ], { timeout: SSH_TIMEOUT, maxBuffer: 1024 * 1024 });
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
    if (!node.sshAlias) return;
    try {
      this.updateConnection(node.id, 'connecting');

      const result = await execFileAsync('ssh', [
        '-o', 'ConnectTimeout=8',
        '-o', 'BatchMode=yes',
        node.sshAlias,
        'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value 2>nul & echo ---UPTIME--- & wmic OS get LastBootUpTime /Value 2>nul',
      ], { timeout: SSH_TIMEOUT, maxBuffer: 512 * 1024 });

      const out = result.stdout;
      const totalKB = parseInt(out.match(/TotalVisibleMemorySize=(\d+)/)?.[1] || '0');
      const freeKB = parseInt(out.match(/FreePhysicalMemory=(\d+)/)?.[1] || '0');
      const totalMB = Math.round(totalKB / 1024);
      const usedMB = Math.round((totalKB - freeKB) / 1024);

      const bootMatch = out.match(/LastBootUpTime=(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
      let uptime = '';
      if (bootMatch) {
        const bootDate = new Date(`${bootMatch[1]}-${bootMatch[2]}-${bootMatch[3]}T${bootMatch[4]}:${bootMatch[5]}:00`);
        const diffMs = Date.now() - bootDate.getTime();
        const days = Math.floor(diffMs / 86400000);
        const hours = Math.floor((diffMs % 86400000) / 3600000);
        uptime = `${days}g ${hours}sa`;
      }

      this.statuses.set(node.id, {
        nodeId: node.id,
        connection: 'online',
        lastChecked: Date.now(),
        ram: { totalMB, usedMB },
        uptime,
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
    if (!node.sshAlias) return;
    try {
      this.updateConnection(node.id, 'connecting');

      const result = await execFileAsync('ssh', [
        '-o', 'ConnectTimeout=8',
        '-o', 'BatchMode=yes',
        node.sshAlias,
        'bash /root/orchestration-status.sh 2>/dev/null || echo \'{"error":"script_missing"}\'',
      ], { timeout: SSH_TIMEOUT, maxBuffer: 512 * 1024 });

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
    const ggToolsCmd = 'node $([ -f $HOME/.claude/good-guys/bin/gg-tools.cjs ] && echo $HOME/.claude/good-guys/bin/gg-tools.cjs || echo $HOME/.openclaw/good-guys/bin/gg-tools.cjs)';
    const localId = this.getLocalNodeId();

    for (const node of NODE_CONFIG) {
      try {
        const status = this.statuses.get(node.id);
        if (!status || (node.id !== localId && status.connection !== 'online')) continue;

        let result;
        if (node.id === localId) {
          result = await execFileAsync('bash', ['-c', `${ggToolsCmd} pc-identity`], {
            timeout: 5000,
            maxBuffer: 64 * 1024,
          });
        } else {
          if (!node.sshAlias) continue;
          result = await execFileAsync('ssh', [
            '-o', 'ConnectTimeout=5',
            '-o', 'BatchMode=yes',
            node.sshAlias,
            `${ggToolsCmd} pc-identity 2>/dev/null || echo '{}'`,
          ], { timeout: 8000, maxBuffer: 64 * 1024 });
        }
        const data = JSON.parse(result.stdout.trim());
        if (data.pc_id || node.id === localId) {
          status!.gg_agent_status = {
            pc_id: data.pc_id || node.id,
            platform: data.platform || 'claude-code',
            active_tasks: 0,
            autonomous_cron: data.autonomous_cron || false,
          };
        }
      } catch { /* GG not installed on this node */ }
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
