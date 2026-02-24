import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  SESSION_CREATE: 'session:create',
  SESSION_KILL: 'session:kill',
  SESSION_SEND_INPUT: 'session:send-input',
  SESSION_RESIZE: 'session:resize',
  SESSION_GET_ALL: 'session:get-all',
  SESSION_GET_OUTPUT: 'session:get-output',
  SESSION_OUTPUT: 'session:output',
  SESSION_STATUS: 'session:status',
  SESSION_RESTART: 'session:restart',
  SSH_GET_HOSTS: 'ssh:get-hosts',
  SSH_ADD_HOST: 'ssh:add-host',
  SSH_REMOVE_HOST: 'ssh:remove-host',
  SSH_TEST: 'ssh:test',
  PROJECTS_AUTOCOMPLETE: 'projects:autocomplete',
  PROJECTS_GET_ALL: 'projects:get-all',
  HOOK_SETUP: 'hook:setup',
  HOOK_UNINSTALL: 'hook:uninstall',
  HOOK_STATUS: 'hook:status',
  HOOK_EVENT: 'hook:event',
  GIT_STATUS: 'git:status',
  GIT_STATUS_UPDATE: 'git:status-update',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  // New channels
  TASK_GET_ALL: 'task:get-all',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  ACTIVITY_GET_ALL: 'activity:get-all',
  ACTIVITY_PUSH: 'activity:push',
  SPRINT_GET: 'sprint:get',
  SPRINT_UPDATE: 'sprint:update',
  TEAM_IMPORT: 'team:import-directory',
  TEAM_GET_SPRINT: 'team:get-sprint',
  TEAM_GET_SKILLS: 'team:get-skills',
  NODE_GET_ALL: 'node:get-all',
  NODE_REFRESH: 'node:refresh',
  NODE_EXEC: 'node:exec',
  NODE_STATUS_UPDATE: 'node:status-update',
  SYSTEM_GET_HOME_DIR: 'system:get-home-dir',
} as const;

// Type-safe API exposed to renderer
const api = {
  // ---- Session ----
  session: {
    create: (config: any) => ipcRenderer.invoke(IPC.SESSION_CREATE, config),
    kill: (id: string) => ipcRenderer.invoke(IPC.SESSION_KILL, id),
    sendInput: (id: string, text: string) => ipcRenderer.invoke(IPC.SESSION_SEND_INPUT, id, text),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke(IPC.SESSION_RESIZE, id, cols, rows),
    getAll: () => ipcRenderer.invoke(IPC.SESSION_GET_ALL),
    getOutput: (id: string) => ipcRenderer.invoke(IPC.SESSION_GET_OUTPUT, id),
    restart: (id: string) => ipcRenderer.invoke(IPC.SESSION_RESTART, id),
  },

  // ---- SSH ----
  ssh: {
    getHosts: () => ipcRenderer.invoke(IPC.SSH_GET_HOSTS),
    addHost: (config: any) => ipcRenderer.invoke(IPC.SSH_ADD_HOST, config),
    removeHost: (id: string) => ipcRenderer.invoke(IPC.SSH_REMOVE_HOST, id),
    test: (host: any) => ipcRenderer.invoke(IPC.SSH_TEST, host),
  },

  // ---- Projects ----
  projects: {
    autocomplete: (partial: string) => ipcRenderer.invoke(IPC.PROJECTS_AUTOCOMPLETE, partial),
    getAll: () => ipcRenderer.invoke(IPC.PROJECTS_GET_ALL),
  },

  // ---- Hook ----
  hook: {
    setup: () => ipcRenderer.invoke(IPC.HOOK_SETUP),
    uninstall: () => ipcRenderer.invoke(IPC.HOOK_UNINSTALL),
    status: () => ipcRenderer.invoke(IPC.HOOK_STATUS),
  },

  // ---- Git ----
  git: {
    status: (sessionId: string) => ipcRenderer.invoke(IPC.GIT_STATUS, sessionId),
  },

  // ---- Settings ----
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (settings: any) => ipcRenderer.invoke(IPC.SETTINGS_SET, settings),
  },

  // ---- Window ----
  window: {
    minimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC.WINDOW_IS_MAXIMIZED),
  },

  // ---- Tasks ----
  task: {
    getAll: () => ipcRenderer.invoke(IPC.TASK_GET_ALL),
    create: (taskData: any) => ipcRenderer.invoke(IPC.TASK_CREATE, taskData),
    update: (taskId: string, update: any) => ipcRenderer.invoke(IPC.TASK_UPDATE, taskId, update),
    delete: (taskId: string) => ipcRenderer.invoke(IPC.TASK_DELETE, taskId),
  },

  // ---- Activities ----
  activity: {
    getAll: () => ipcRenderer.invoke(IPC.ACTIVITY_GET_ALL),
    push: (activity: any) => ipcRenderer.invoke(IPC.ACTIVITY_PUSH, activity),
  },

  // ---- Sprint ----
  sprint: {
    get: () => ipcRenderer.invoke(IPC.SPRINT_GET),
  },

  // ---- Team ----
  team: {
    import: () => ipcRenderer.invoke(IPC.TEAM_IMPORT),
    getSprint: (dirPath: string) => ipcRenderer.invoke(IPC.TEAM_GET_SPRINT, dirPath),
    getSkills: (dirPath: string) => ipcRenderer.invoke(IPC.TEAM_GET_SKILLS, dirPath),
  },

  // ---- Nodes ----
  node: {
    getAll: () => ipcRenderer.invoke(IPC.NODE_GET_ALL),
    refresh: (nodeId: string) => ipcRenderer.invoke(IPC.NODE_REFRESH, nodeId),
    exec: (nodeId: string, command: string) => ipcRenderer.invoke(IPC.NODE_EXEC, nodeId, command),
  },

  // ---- System ----
  system: {
    getHomeDir: () => ipcRenderer.invoke(IPC.SYSTEM_GET_HOME_DIR),
  },

  // ---- Generic event listeners for push events ----
  on: (channel: string, callback: (...args: any[]) => void) => {
    const allowedChannels: string[] = [
      IPC.SESSION_OUTPUT,
      IPC.SESSION_STATUS,
      IPC.GIT_STATUS_UPDATE,
      IPC.HOOK_EVENT,
      IPC.NODE_STATUS_UPDATE,
    ];
    if (!allowedChannels.includes(channel)) return;
    const listener = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    // Return the wrapped listener so callers can remove it
    return listener;
  },
  off: (channel: string, _callback: (...args: any[]) => void) => {
    const allowedChannels: string[] = [
      IPC.SESSION_OUTPUT,
      IPC.SESSION_STATUS,
      IPC.GIT_STATUS_UPDATE,
      IPC.HOOK_EVENT,
      IPC.NODE_STATUS_UPDATE,
    ];
    if (!allowedChannels.includes(channel)) return;
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type VibeZoneAPI = typeof api;
