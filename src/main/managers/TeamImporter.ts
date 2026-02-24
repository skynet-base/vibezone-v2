import { randomUUID } from 'crypto';
import { readFileSync, existsSync, readdirSync, watchFile, unwatchFile, StatWatcher } from 'fs';
import { join } from 'path';
import { SprintState, Session, AgentType, TEAM_AGENT_TYPES, AGENT_INFO } from '../../shared/types';

type SprintChangeCallback = (sprintState: SprintState | null) => void;

export class TeamImporter {
  private watchers: Map<string, StatWatcher> = new Map();

  // ── Main import ────────────────────────────────────────────

  importDirectory(dirPath: string): { sessions: Session[]; sprintState: SprintState | null; projectName: string } {
    if (!dirPath || typeof dirPath !== 'string') {
      return { sessions: [], sprintState: null, projectName: '' };
    }

    const agentsDir = this.resolveAgentsDir(dirPath);
    if (!agentsDir) {
      return { sessions: [], sprintState: null, projectName: '' };
    }

    const projectName = this.readProjectName(agentsDir);
    const sprintState = this.readSprintState(agentsDir);
    const sessions = this.createTeamSessions(dirPath);

    return { sessions, sprintState, projectName };
  }

  // ── Team sessions ──────────────────────────────────────────

  createTeamSessions(dirPath: string): Session[] {
    const teamTypes: AgentType[] = ['team-lead', 'designer', 'frontend', 'backend', 'qa', 'devops'];
    const now = Date.now();

    return teamTypes.map((agentType) => {
      const info = AGENT_INFO[agentType];
      const session: Session = {
        id: randomUUID(),
        name: info.label,
        agentType,
        location: 'local',
        cwd: dirPath,
        status: 'idle',
        category: 'team',
        createdAt: now,
        lastActivity: now,
      };
      return session;
    });
  }

  // ── Sprint state ───────────────────────────────────────────

  getSprintState(dirPath: string): SprintState | null {
    const agentsDir = this.resolveAgentsDir(dirPath);
    if (!agentsDir) return null;
    return this.readSprintState(agentsDir);
  }

  // ── Skills ─────────────────────────────────────────────────

  getSkills(dirPath: string): Record<string, string> {
    const agentsDir = this.resolveAgentsDir(dirPath);
    if (!agentsDir) return {};

    const skillsDir = join(agentsDir, 'skills');
    if (!existsSync(skillsDir)) return {};

    const skills: Record<string, string> = {};

    try {
      const files = readdirSync(skillsDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const skillName = file.replace(/\.md$/, '');
        try {
          skills[skillName] = readFileSync(join(skillsDir, file), 'utf-8');
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skills directory not readable
    }

    return skills;
  }

  // ── File watching ──────────────────────────────────────────

  watchSprintState(dirPath: string, callback: SprintChangeCallback): void {
    const agentsDir = this.resolveAgentsDir(dirPath);
    if (!agentsDir) return;

    const sprintFile = join(agentsDir, 'sprint-state.json');
    if (!existsSync(sprintFile)) return;

    // Unwatch if already watching this path
    this.unwatchSprintState(dirPath);

    const watcher = watchFile(sprintFile, { interval: 2000 }, () => {
      const state = this.readSprintState(agentsDir);
      callback(state);
    });

    this.watchers.set(dirPath, watcher);
  }

  unwatchSprintState(dirPath: string): void {
    const agentsDir = this.resolveAgentsDir(dirPath);
    if (!agentsDir) return;

    const sprintFile = join(agentsDir, 'sprint-state.json');

    if (this.watchers.has(dirPath)) {
      unwatchFile(sprintFile);
      this.watchers.delete(dirPath);
    }
  }

  unwatchAll(): void {
    for (const dirPath of this.watchers.keys()) {
      this.unwatchSprintState(dirPath);
    }
    this.watchers.clear();
  }

  // ── Internal helpers ───────────────────────────────────────

  private resolveAgentsDir(dirPath: string): string | null {
    // Check if dirPath itself is .ai-agents
    if (dirPath.endsWith('.ai-agents') && existsSync(dirPath)) {
      return dirPath;
    }

    // Check for .ai-agents subfolder
    const subDir = join(dirPath, '.ai-agents');
    if (existsSync(subDir)) {
      return subDir;
    }

    return null;
  }

  private readProjectName(agentsDir: string): string {
    const contextFile = join(agentsDir, 'shared-context.json');
    if (!existsSync(contextFile)) return '';

    try {
      const content = readFileSync(contextFile, 'utf-8');
      const data = JSON.parse(content);
      return data.projectName || data.project_name || data.name || '';
    } catch {
      return '';
    }
  }

  private readSprintState(agentsDir: string): SprintState | null {
    const sprintFile = join(agentsDir, 'sprint-state.json');
    if (!existsSync(sprintFile)) return null;

    try {
      const content = readFileSync(sprintFile, 'utf-8');
      const data = JSON.parse(content);
      // Validate essential sprint structure
      if (!data || typeof data !== 'object' || typeof data.sprintNumber !== 'number') {
        console.error('TeamImporter: malformed sprint-state.json, skipping');
        return null;
      }
      return {
        sprintNumber: data.sprintNumber,
        goal: typeof data.goal === 'string' ? data.goal : '',
        stories: Array.isArray(data.stories) ? data.stories : [],
        velocity: data.velocity && typeof data.velocity === 'object'
          ? { planned: data.velocity.planned ?? 0, completed: data.velocity.completed ?? 0 }
          : { planned: 0, completed: 0 },
      };
    } catch (err) {
      console.error('TeamImporter: failed to parse sprint-state.json:', err);
      return null;
    }
  }
}
