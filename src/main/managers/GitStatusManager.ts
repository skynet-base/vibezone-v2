import { execFile } from 'child_process';
import { promisify } from 'util';
import { GitStatus } from '../../shared/types';

const execFileAsync = promisify(execFile);

type GitStatusCallback = (sessionId: string, status: GitStatus) => void;

export class GitStatusManager {
  private statusCache: Map<string, GitStatus> = new Map();
  private directories: Map<string, string> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private onUpdate: GitStatusCallback | null = null;

  private readonly POLL_INTERVAL_MS = 5000;
  private readonly EXEC_TIMEOUT_MS = 5000;

  setUpdateHandler(handler: GitStatusCallback): void {
    this.onUpdate = handler;
  }

  track(sessionId: string, directory: string): void {
    this.directories.set(sessionId, directory);
    this.fetchStatus(sessionId, directory);
  }

  untrack(sessionId: string): void {
    this.directories.delete(sessionId);
    this.statusCache.delete(sessionId);
  }

  getStatus(sessionId: string): GitStatus | null {
    return this.statusCache.get(sessionId) ?? null;
  }

  start(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => this.pollAll(), this.POLL_INTERVAL_MS);
    this.pollAll();
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async refresh(sessionId: string): Promise<GitStatus | null> {
    const directory = this.directories.get(sessionId);
    if (!directory) return null;
    return this.fetchStatus(sessionId, directory);
  }

  private async pollAll(): Promise<void> {
    const entries = Array.from(this.directories.entries());
    await Promise.all(
      entries.map(([sessionId, directory]) => this.fetchStatus(sessionId, directory))
    );
  }

  private async fetchStatus(sessionId: string, directory: string): Promise<GitStatus> {
    const status = await this.getGitStatus(directory);
    const oldStatus = this.statusCache.get(sessionId);
    const changed = !oldStatus || this.hasChanged(oldStatus, status);

    this.statusCache.set(sessionId, status);

    if (changed && this.onUpdate) {
      this.onUpdate(sessionId, status);
    }

    return status;
  }

  private hasChanged(old: GitStatus, current: GitStatus): boolean {
    return (
      old.branch !== current.branch ||
      old.ahead !== current.ahead ||
      old.behind !== current.behind ||
      old.staged !== current.staged ||
      old.unstaged !== current.unstaged ||
      old.untracked !== current.untracked ||
      old.linesAdded !== current.linesAdded ||
      old.linesRemoved !== current.linesRemoved
    );
  }

  private async getGitStatus(directory: string): Promise<GitStatus> {
    const empty: GitStatus = {
      branch: '',
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      linesAdded: 0,
      linesRemoved: 0,
    };

    try {
      await this.execGit(['rev-parse', '--git-dir'], directory);
    } catch {
      return empty;
    }

    const [branchResult, statusResult, diffStagedResult, diffUnstagedResult] =
      await Promise.all([
        this.execGit(['rev-parse', '--abbrev-ref', 'HEAD'], directory).catch(() => ''),
        this.execGit(['status', '--porcelain'], directory).catch(() => ''),
        this.execGit(['diff', '--cached', '--shortstat'], directory).catch(() => ''),
        this.execGit(['diff', '--shortstat'], directory).catch(() => ''),
      ]);

    const status: GitStatus = { ...empty };

    // Branch
    status.branch = branchResult.trim();

    // Ahead/behind
    try {
      const abResult = await this.execGit(
        ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
        directory
      );
      const [behind, ahead] = abResult.trim().split(/\s+/).map(Number);
      status.ahead = ahead || 0;
      status.behind = behind || 0;
    } catch {
      // No upstream configured
    }

    // Porcelain status counts
    const lines = statusResult.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const staged = line[0];
      const unstaged = line[1];

      if (staged === '?' && unstaged === '?') {
        status.untracked++;
      } else {
        if (staged && staged !== ' ' && staged !== '?') {
          status.staged++;
        }
        if (unstaged && unstaged !== ' ' && unstaged !== '?') {
          status.unstaged++;
        }
      }
    }

    // Diff stats
    const parseDiffStat = (output: string): { added: number; removed: number } => {
      const addMatch = output.match(/(\d+) insertion/i);
      const delMatch = output.match(/(\d+) deletion/i);
      return {
        added: addMatch ? parseInt(addMatch[1], 10) : 0,
        removed: delMatch ? parseInt(delMatch[1], 10) : 0,
      };
    };

    const stagedDiff = parseDiffStat(diffStagedResult);
    const unstagedDiff = parseDiffStat(diffUnstagedResult);
    status.linesAdded = stagedDiff.added + unstagedDiff.added;
    status.linesRemoved = stagedDiff.removed + unstagedDiff.removed;

    return status;
  }

  private async execGit(args: string[], cwd: string): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: this.EXEC_TIMEOUT_MS,
    });
    return stdout;
  }
}
