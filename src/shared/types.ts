// Agent types (terminal + team)
export type AgentType =
  | 'shell' | 'claude' | 'clawbot' | 'opencode' | 'codex' | 'custom'        // terminal
  | 'team-lead' | 'designer' | 'frontend' | 'backend' | 'qa' | 'devops';  // team

// Agent category
export type AgentCategory = 'terminal' | 'team';

// Session status
export type SessionStatus = 'idle' | 'working' | 'waiting' | 'offline';

// Session location
export type SessionLocation = 'local' | 'remote';

// Session configuration for creating a new session
export interface SessionConfig {
  name: string;
  agentType: AgentType;
  location: SessionLocation;
  sshHost?: string;
  cwd: string;
  customCommand?: string;
  flags?: string;
  category?: AgentCategory;
}

// Active session state
export interface Session {
  id: string;
  name: string;
  agentType: AgentType;
  location: SessionLocation;
  sshHost?: string;
  cwd: string;
  status: SessionStatus;
  pid?: number;
  createdAt: number;
  lastActivity: number;
  customCommand?: string;
  flags?: string;
  category?: AgentCategory;
}

// Git status for a session
export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  linesAdded: number;
  linesRemoved: number;
}

// SSH host configuration
export interface SSHHost {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  identityFile?: string;
  isManual: boolean;
}

// Project directory entry
export interface ProjectEntry {
  path: string;
  name: string;
  lastUsed: number;
  useCount: number;
}

// Autocomplete result
export interface AutocompleteResult {
  path: string;
  name: string;
  isDirectory: boolean;
  isProject: boolean;
}

// Hook event from Claude Code
export interface HookEvent {
  id: string;
  type: HookEventType;
  sessionId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type HookEventType =
  | 'pre_tool_use'
  | 'post_tool_use'
  | 'stop'
  | 'subagent_stop'
  | 'session_start'
  | 'session_end'
  | 'user_prompt_submit'
  | 'notification'
  | 'pre_compact';

// Task system
export type TaskStatus = 'inbox' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeSessionId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Activity {
  id: string;
  type: 'task_created' | 'task_moved' | 'task_deleted' | 'task_assigned'
      | 'agent_started' | 'agent_stopped' | 'hook_event' | 'sprint_update';
  description: string;
  sessionId?: string;
  taskId?: string;
  timestamp: number;
  icon: string;
}

// Sprint (ai-agent-team-setup)
export interface SprintState {
  sprintNumber: number;
  goal: string;
  stories: SprintStory[];
  velocity: { planned: number; completed: number };
}

export interface SprintStory {
  id: string;
  title: string;
  assignedTo: string[];
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  qualityScore?: number;
}

// Agent info mapping (colors, emojis, labels)
export const AGENT_INFO: Record<AgentType, { color: string; emoji: string; label: string; category: AgentCategory }> = {
  shell:       { color: '#00ff88', emoji: '>', label: 'Terminal',    category: 'terminal' },
  claude:      { color: '#8b5cf6', emoji: '🤖', label: 'Claude',     category: 'terminal' },
  clawbot:     { color: '#f59e0b', emoji: '🦀', label: 'Clawbot',    category: 'terminal' },
  opencode:    { color: '#06b6d4', emoji: '💻', label: 'OpenCode',   category: 'terminal' },
  codex:       { color: '#10b981', emoji: '📦', label: 'Codex',      category: 'terminal' },
  custom:      { color: '#ff6b6b', emoji: '⚡', label: 'Custom',     category: 'terminal' },
  'team-lead': { color: '#eab308', emoji: '👔', label: 'Team Lead',  category: 'team' },
  designer:    { color: '#ec4899', emoji: '🎨', label: 'Designer',   category: 'team' },
  frontend:    { color: '#3b82f6', emoji: '⚛️', label: 'Frontend',   category: 'team' },
  backend:     { color: '#f97316', emoji: '🔧', label: 'Backend',    category: 'team' },
  qa:          { color: '#22c55e', emoji: '✅', label: 'QA',         category: 'team' },
  devops:      { color: '#a855f7', emoji: '🚀', label: 'DevOps',     category: 'team' },
};

// Backward compat: AGENT_COLORS derived from AGENT_INFO
export const AGENT_COLORS: Record<AgentType, string> = Object.fromEntries(
  Object.entries(AGENT_INFO).map(([k, v]) => [k, v.color])
) as Record<AgentType, string>;

// Helper
export function getAgentCategory(agentType: AgentType): AgentCategory {
  return AGENT_INFO[agentType].category;
}

export const TERMINAL_AGENT_TYPES: AgentType[] = ['shell', 'claude', 'clawbot', 'opencode', 'codex', 'custom'];
export const TEAM_AGENT_TYPES: AgentType[] = ['team-lead', 'designer', 'frontend', 'backend', 'qa', 'devops'];

// Remote Node (Multi-PC)
export type NodeId = 'pc1' | 'pc2' | 'vps' | 'pc4';
export type NodeConnectionStatus = 'online' | 'offline' | 'connecting';
export type MonitorType = 'local' | 'ssh-windows' | 'ssh-linux';

export interface NodeInfo {
  id: NodeId;
  name: string;
  hostname: string;
  ip: string;
  tailscaleIp?: string;
  user: string;
  os: string;
  role: string;
  sshAlias: string | null; // null = local node
  color: string;
  monitorType: MonitorType;
}

export interface GGAgentStatus {
  pc_id: string;
  platform: 'claude-code' | 'codex';
  model_tier?: string;
  active_tasks: number;
  last_dispatch?: string;
  autonomous_cron: boolean;
}

export interface NodeStatus {
  nodeId: NodeId;
  connection: NodeConnectionStatus;
  lastChecked: number;
  ram?: { totalMB: number; usedMB: number };
  disk?: { totalGB: number; usedPercent: number };
  uptime?: string;
  services?: NodeService[];
  cronJobs?: NodeCronJob[];
  error?: string;
  gg_agent_status?: GGAgentStatus;
}

export interface NodeService {
  name: string;
  status: 'running' | 'stopped' | 'error';
  pid?: string;
  memPercent?: string;
}

export interface NodeCronJob {
  name: string;
  enabled: boolean;
  lastStatus: string;
  errors: number;
  lastRun?: string;
}

export interface NodeCommandResult {
  nodeId: NodeId;
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
}

export const NODE_CONFIG: NodeInfo[] = [
  {
    id: 'pc1', name: 'Master', hostname: 'PC1',
    ip: 'localhost', tailscaleIp: undefined, user: 'TR', os: 'Windows 11',
    role: 'Command Center', sshAlias: null, color: '#00ccff',
    monitorType: 'local',
  },
  {
    id: 'pc2', name: 'Skynet', hostname: 'DESKTOP-P7946G1',
    ip: '192.168.1.33', tailscaleIp: '100.121.119.37', user: 'Skynet', os: 'Windows 10',
    role: 'Social Agent', sshAlias: 'pc2', color: '#f59e0b',
    monitorType: 'ssh-windows',
  },
  {
    id: 'vps', name: 'VPS', hostname: 'srv1315341',
    ip: '76.13.135.57', tailscaleIp: '100.101.164.20', user: 'root', os: 'Ubuntu 24.04',
    role: 'OPS Agent', sshAlias: 'vps', color: '#00ff88',
    monitorType: 'ssh-linux',
  },
  {
    id: 'pc4', name: 'Laptop', hostname: 'LAPTOP',
    ip: 'localhost', tailscaleIp: undefined, user: 'TR', os: 'Windows 11',
    role: 'Mobile Command', sshAlias: 'pc4', color: '#ec4899',
    monitorType: 'ssh-windows',
  },
];

// Chat message
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

// App settings
export interface AppSettings {
  autoStart: boolean;
  minimizeToTray: boolean;
  quality: 'low' | 'medium' | 'high';
  particlesEnabled: boolean;
  hookEnabled: boolean;
  hookPort?: number;
  sshHosts: SSHHost[];
  recentProjects: ProjectEntry[];
  windowBounds?: { x: number; y: number; width: number; height: number };
  teamProjectPath?: string;
  language?: 'tr' | 'en';
  localNodeId?: NodeId;
}

// IPC channel names
export const IPC = {
  // Session
  SESSION_CREATE: 'session:create',
  SESSION_KILL: 'session:kill',
  SESSION_SEND_INPUT: 'session:send-input',
  SESSION_RESIZE: 'session:resize',
  SESSION_GET_ALL: 'session:get-all',
  SESSION_GET_OUTPUT: 'session:get-output',
  SESSION_OUTPUT: 'session:output',
  SESSION_STATUS: 'session:status',
  SESSION_RESTART: 'session:restart',

  // SSH
  SSH_GET_HOSTS: 'ssh:get-hosts',
  SSH_ADD_HOST: 'ssh:add-host',
  SSH_REMOVE_HOST: 'ssh:remove-host',
  SSH_TEST: 'ssh:test',

  // Projects
  PROJECTS_AUTOCOMPLETE: 'projects:autocomplete',
  PROJECTS_GET_ALL: 'projects:get-all',

  // Hook
  HOOK_SETUP: 'hook:setup',
  HOOK_UNINSTALL: 'hook:uninstall',
  HOOK_STATUS: 'hook:status',
  HOOK_EVENT: 'hook:event',

  // Git
  GIT_STATUS: 'git:status',
  GIT_STATUS_UPDATE: 'git:status-update',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // Task
  TASK_GET_ALL: 'task:get-all',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',

  // Activity
  ACTIVITY_GET_ALL: 'activity:get-all',
  ACTIVITY_PUSH: 'activity:push',

  // Sprint
  SPRINT_GET: 'sprint:get',
  SPRINT_UPDATE: 'sprint:update',

  // Team
  TEAM_IMPORT: 'team:import-directory',
  TEAM_GET_SPRINT: 'team:get-sprint',
  TEAM_GET_SKILLS: 'team:get-skills',

  // Nodes (Multi-PC)
  NODE_GET_ALL: 'node:get-all',
  NODE_REFRESH: 'node:refresh',
  NODE_EXEC: 'node:exec',
  NODE_STATUS_UPDATE: 'node:status-update',

  // System
  SYSTEM_GET_HOME_DIR: 'system:get-home-dir',
} as const;
