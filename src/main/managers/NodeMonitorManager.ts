import { execFile } from 'child_process';
import { promisify } from 'util';
import type { NodeId, NodeStatus, NodeCommandResult } from '../../shared/types';

const execFileAsync = promisify(execFile);

const POLL_INTERVAL = 30_000; // 30 seconds
const SSH_TIMEOUT = 10_000;

type StatusHandler = (statuses: NodeStatus[]) => void;

export class NodeMonitorManager {
  private statuses: Map<NodeId, NodeStatus> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private statusHandler: StatusHandler | null = null;

  constructor() {
    // Initialize with defaults
    for (const id of ['pc1', 'pc2', 'vps'] as NodeId[]) {
      this.statuses.set(id, {
        nodeId: id,
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

  start(): void {
    // Initial poll
    this.pollAll();
    // Periodic polling
    this.pollTimer = setInterval(() => this.pollAll(), POLL_INTERVAL);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async pollAll(): Promise<void> {
    await Promise.allSettled([
      this.pollPC1(),
      this.pollPC2(),
      this.pollVPS(),
    ]);
    this.emit();
  }

  async refreshNode(nodeId: NodeId): Promise<NodeStatus> {
    switch (nodeId) {
      case 'pc1': await this.pollPC1(); break;
      case 'pc2': await this.pollPC2(); break;
      case 'vps': await this.pollVPS(); break;
    }
    this.emit();
    return this.statuses.get(nodeId)!;
  }

  async executeCommand(nodeId: NodeId, command: string): Promise<NodeCommandResult> {
    const timestamp = Date.now();
    try {
      let output: string;
      let exitCode = 0;

      if (nodeId === 'pc1') {
        // Local execution
        const result = await execFileAsync('bash', ['-c', command], {
          timeout: SSH_TIMEOUT,
          maxBuffer: 1024 * 1024,
        });
        output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
      } else {
        // Remote via SSH
        const alias = nodeId === 'pc2' ? 'pc2' : 'vps';
        const result = await execFileAsync('ssh', [
          '-o', 'ConnectTimeout=8',
          '-o', 'BatchMode=yes',
          alias,
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

  // ---- PC1 (Local) ----
  private async pollPC1(): Promise<void> {
    try {
      const os = await import('os');
      const totalMB = Math.round(os.totalmem() / 1024 / 1024);
      const freeMB = Math.round(os.freemem() / 1024 / 1024);
      const usedMB = totalMB - freeMB;
      const uptimeSeconds = os.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);

      this.statuses.set('pc1', {
        nodeId: 'pc1',
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
      this.statuses.set('pc1', {
        nodeId: 'pc1',
        connection: 'online',
        lastChecked: Date.now(),
      });
    }
  }

  // ---- PC2 (Skynet - Windows SSH) ----
  private async pollPC2(): Promise<void> {
    try {
      this.updateConnection('pc2', 'connecting');

      const result = await execFileAsync('ssh', [
        '-o', 'ConnectTimeout=8',
        '-o', 'BatchMode=yes',
        'pc2',
        'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value 2>nul & echo ---UPTIME--- & wmic OS get LastBootUpTime /Value 2>nul',
      ], { timeout: SSH_TIMEOUT, maxBuffer: 512 * 1024 });

      const out = result.stdout;
      const totalKB = parseInt(out.match(/TotalVisibleMemorySize=(\d+)/)?.[1] || '0');
      const freeKB = parseInt(out.match(/FreePhysicalMemory=(\d+)/)?.[1] || '0');
      const totalMB = Math.round(totalKB / 1024);
      const usedMB = Math.round((totalKB - freeKB) / 1024);

      // Parse uptime from LastBootUpTime
      const bootMatch = out.match(/LastBootUpTime=(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
      let uptime = '';
      if (bootMatch) {
        const bootDate = new Date(`${bootMatch[1]}-${bootMatch[2]}-${bootMatch[3]}T${bootMatch[4]}:${bootMatch[5]}:00`);
        const diffMs = Date.now() - bootDate.getTime();
        const days = Math.floor(diffMs / 86400000);
        const hours = Math.floor((diffMs % 86400000) / 3600000);
        uptime = `${days}g ${hours}sa`;
      }

      this.statuses.set('pc2', {
        nodeId: 'pc2',
        connection: 'online',
        lastChecked: Date.now(),
        ram: { totalMB, usedMB },
        uptime,
        services: [
          { name: 'OpenClaw', status: 'running' },
          { name: 'SSH Server', status: 'running' },
        ],
      });
    } catch (err: any) {
      this.statuses.set('pc2', {
        nodeId: 'pc2',
        connection: 'offline',
        lastChecked: Date.now(),
        error: err.message?.slice(0, 100),
      });
    }
  }

  // ---- VPS (Ubuntu SSH) ----
  private async pollVPS(): Promise<void> {
    try {
      this.updateConnection('vps', 'connecting');

      const result = await execFileAsync('ssh', [
        '-o', 'ConnectTimeout=8',
        '-o', 'BatchMode=yes',
        'vps',
        'bash /root/orchestration-status.sh 2>/dev/null || echo \'{"error":"script_missing"}\'',
      ], { timeout: SSH_TIMEOUT, maxBuffer: 512 * 1024 });

      const data = JSON.parse(result.stdout.trim());

      if (data.error) {
        // Fallback: basic check
        this.statuses.set('vps', {
          nodeId: 'vps',
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

      this.statuses.set('vps', {
        nodeId: 'vps',
        connection: 'online',
        lastChecked: Date.now(),
        ram: data.ram ? { totalMB: data.ram.total_mb, usedMB: data.ram.used_mb } : undefined,
        disk: data.disk_percent ? { totalGB: 48, usedPercent: data.disk_percent } : undefined,
        uptime: data.uptime,
        services,
        cronJobs,
      });
    } catch (err: any) {
      this.statuses.set('vps', {
        nodeId: 'vps',
        connection: 'offline',
        lastChecked: Date.now(),
        error: err.message?.slice(0, 100),
      });
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
