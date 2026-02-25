import type { Session, SessionConfig, SSHHost, AutocompleteResult, ProjectEntry, AppSettings, GitStatus, Task, Activity, SprintState, NodeStatus, NodeCommandResult } from '@shared/types';

interface ElectronAPI {
  session: {
    create: (config: SessionConfig) => Promise<Session>;
    kill: (sessionId: string) => Promise<boolean>;
    sendInput: (sessionId: string, data: string) => Promise<boolean>;
    resize: (sessionId: string, cols: number, rows: number) => Promise<boolean>;
    getAll: () => Promise<Session[]>;
    getOutput: (sessionId: string) => Promise<string>;
    restart: (sessionId: string) => Promise<Session | null>;
  };
  ssh: {
    getHosts: () => Promise<SSHHost[]>;
    addHost: (host: Omit<SSHHost, 'id' | 'isManual'>) => Promise<SSHHost>;
    removeHost: (hostId: string) => Promise<boolean>;
    test: (host: SSHHost | string) => Promise<{ success: boolean; error?: string }>;
  };
  projects: {
    autocomplete: (query: string) => Promise<AutocompleteResult[]>;
    getAll: () => Promise<ProjectEntry[]>;
  };
  hook: {
    setup: () => Promise<{ success: boolean; error?: string }>;
    uninstall: () => Promise<void>;
    status: () => Promise<{ enabled: boolean; port?: number }>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    set: (settings: Partial<AppSettings>) => Promise<void>;
  };
  git: {
    status: (sessionId: string) => Promise<GitStatus | null>;
  };
  task: {
    getAll: () => Promise<Task[]>;
    create: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
    update: (taskId: string, update: Partial<Task>) => Promise<Task>;
    delete: (taskId: string) => Promise<void>;
  };
  activity: {
    getAll: () => Promise<Activity[]>;
    push: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<Activity>;
  };
  sprint: {
    get: () => Promise<SprintState | null>;
  };
  team: {
    import: () => Promise<{ sessions: Session[]; sprintState: SprintState | null; projectName: string } | null>;
    getSprint: (dirPath: string) => Promise<SprintState | null>;
    getSkills: (dirPath: string) => Promise<Record<string, string>>;
  };
  node: {
    getAll: () => Promise<NodeStatus[]>;
    refresh: (nodeId: string) => Promise<NodeStatus>;
    exec: (nodeId: string, command: string) => Promise<NodeCommandResult>;
  };
  system: {
    getHomeDir: () => Promise<string>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    toggleFullscreen: () => Promise<boolean>;
    isFullscreen: () => Promise<boolean>;
  };
  dialog: {
    openFolder: () => Promise<string | null>;
    openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
    saveFile: (defaultPath?: string) => Promise<string | null>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
