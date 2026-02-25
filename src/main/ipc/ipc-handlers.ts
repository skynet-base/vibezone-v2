import { ipcMain, BrowserWindow, dialog } from 'electron';
import os from 'os';
import { IPC, SessionConfig, SSHHost, AppSettings, Task, Activity, NodeId } from '../../shared/types';
import { SessionManager } from '../managers/SessionManager';
import { SSHManager } from '../managers/SSHManager';
import { ProjectsManager } from '../managers/ProjectsManager';
import { HookManager } from '../managers/HookManager';
import { GitStatusManager } from '../managers/GitStatusManager';
import { ConfigManager } from '../managers/ConfigManager';
import { TaskManager } from '../managers/TaskManager';
import { TeamImporter } from '../managers/TeamImporter';
import { NodeMonitorManager } from '../managers/NodeMonitorManager';

// Input validation helpers
function validateString(value: unknown, name: string, maxLength = 1024): string {
  if (typeof value !== 'string') throw new Error(`${name} must be a string`);
  if (value.length > maxLength) throw new Error(`${name} exceeds maximum length of ${maxLength}`);
  return value;
}

function validateOptionalString(value: unknown, name: string, maxLength = 1024): string | undefined {
  if (value === undefined || value === null) return undefined;
  return validateString(value, name, maxLength);
}

function validateSessionConfig(config: unknown): SessionConfig {
  if (!config || typeof config !== 'object') throw new Error('Invalid session config');
  const c = config as Record<string, unknown>;
  return {
    name: validateString(c.name, 'name', 100),
    agentType: validateString(c.agentType, 'agentType', 50) as SessionConfig['agentType'],
    location: validateOptionalString(c.location, 'location', 10) as SessionConfig['location'] || 'local',
    sshHost: validateOptionalString(c.sshHost, 'sshHost'),
    cwd: validateOptionalString(c.cwd, 'cwd', 500) || process.env.HOME || process.env.USERPROFILE || '.',
    customCommand: validateOptionalString(c.customCommand, 'customCommand', 500),
    flags: validateOptionalString(c.flags, 'flags', 500),
    category: validateOptionalString(c.category, 'category', 20) as SessionConfig['category'],
  };
}

export function registerIPCHandlers(
  win: BrowserWindow,
  sessionManager: SessionManager,
  sshManager: SSHManager,
  projectsManager: ProjectsManager,
  hookManager: HookManager,
  gitStatusManager: GitStatusManager,
  configManager: ConfigManager,
  taskManager: TaskManager,
  teamImporter: TeamImporter,
  nodeMonitor: NodeMonitorManager,
): void {
  const send = (channel: string, ...args: any[]) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  };

  // ---- Session handlers ----

  ipcMain.handle(IPC.SESSION_CREATE, async (_event, rawConfig: unknown) => {
    const config = validateSessionConfig(rawConfig);
    if (config.location === 'remote' && config.sshHost) {
      const hosts = sshManager.getAllHosts();
      const host = hosts.find(h => h.id === config.sshHost);
      if (!host) throw new Error('SSH host not found');
      const session = await sshManager.createRemoteSession(host, config);
      gitStatusManager.track(session.id, config.cwd);
      projectsManager.addProject(config.cwd);
      return session;
    }

    const session = sessionManager.createSession(config);
    // Only track git for terminal agents
    if (session.category !== 'team') {
      gitStatusManager.track(session.id, config.cwd);
      projectsManager.addProject(config.cwd);
    }

    // Log activity
    taskManager.pushActivity({
      type: 'agent_started',
      description: `${session.name} baslatildi`,
      sessionId: session.id,
      icon: '🚀',
    });

    return session;
  });

  ipcMain.handle(IPC.SESSION_KILL, async (_event, id: unknown) => {
    const sessionId = validateString(id, 'sessionId', 100);
    const session = sessionManager.getSession(sessionId);
    gitStatusManager.untrack(sessionId);

    const remote = sshManager.getSession(sessionId);
    if (remote) {
      return sshManager.killRemoteSession(sessionId);
    }

    const result = sessionManager.killSession(sessionId);

    if (session) {
      taskManager.pushActivity({
        type: 'agent_stopped',
        description: `${session.name} durduruldu`,
        sessionId,
        icon: '⏹️',
      });
    }

    return result;
  });

  ipcMain.handle(IPC.SESSION_SEND_INPUT, async (_event, id: unknown, text: unknown) => {
    try {
      const sessionId = validateString(id, 'sessionId', 100);
      if (typeof text !== 'string') throw new Error('Input text must be a string');
      if (text.length > 1024 * 1024) throw new Error('Input text too large');
      const remote = sshManager.getSession(sessionId);
      if (remote) {
        return sshManager.sendInput(sessionId, text);
      }
      return sessionManager.sendInput(sessionId, text);
    } catch {
      return false;
    }
  });

  ipcMain.handle(IPC.SESSION_RESIZE, async (_event, id: unknown, cols: unknown, rows: unknown) => {
    const sessionId = validateString(id, 'sessionId', 100);
    const numCols = typeof cols === 'number' ? Math.max(1, Math.min(cols, 500)) : 120;
    const numRows = typeof rows === 'number' ? Math.max(1, Math.min(rows, 200)) : 30;
    return sessionManager.resizePTY(sessionId, numCols, numRows);
  });

  ipcMain.handle(IPC.SESSION_GET_ALL, async () => {
    return sessionManager.getAllSessions();
  });

  ipcMain.handle(IPC.SESSION_GET_OUTPUT, async (_event, id: unknown) => {
    try {
      const sessionId = validateString(id, 'sessionId', 100);
      const remoteOutput = sshManager.getOutputBuffer(sessionId);
      if (remoteOutput) return remoteOutput;
      return sessionManager.getOutputBuffer(sessionId);
    } catch {
      return '';
    }
  });

  ipcMain.handle(IPC.SESSION_RESTART, async (_event, id: unknown) => {
    const sessionId = validateString(id, 'sessionId', 100);
    gitStatusManager.untrack(sessionId);
    const session = sessionManager.restartSession(sessionId);
    if (session) {
      gitStatusManager.track(session.id, session.cwd);
    }
    return session;
  });

  // ---- SSH handlers ----

  ipcMain.handle(IPC.SSH_GET_HOSTS, async () => {
    return sshManager.getAllHosts();
  });

  ipcMain.handle(IPC.SSH_ADD_HOST, async (_event, config: Omit<SSHHost, 'id' | 'isManual'>) => {
    return sshManager.addManualHost(config);
  });

  ipcMain.handle(IPC.SSH_REMOVE_HOST, async (_event, id: unknown) => {
    const hostId = validateString(id, 'hostId', 100);
    return sshManager.removeHost(hostId);
  });

  ipcMain.handle(IPC.SSH_TEST, async (_event, hostOrId: SSHHost | string) => {
    let host: SSHHost;
    if (typeof hostOrId === 'string') {
      const found = sshManager.getAllHosts().find(h => h.id === hostOrId);
      if (!found) throw new Error('SSH host not found');
      host = found;
    } else {
      host = hostOrId;
    }
    return sshManager.testConnection(host);
  });

  // ---- Projects handlers ----

  ipcMain.handle(IPC.PROJECTS_AUTOCOMPLETE, async (_event, partial: unknown) => {
    const query = validateString(partial, 'query', 500);
    return projectsManager.autocomplete(query);
  });

  ipcMain.handle(IPC.PROJECTS_GET_ALL, async () => {
    return projectsManager.getProjects();
  });

  // ---- Hook handlers ----

  ipcMain.handle(IPC.HOOK_SETUP, async () => {
    return hookManager.setup();
  });

  ipcMain.handle(IPC.HOOK_UNINSTALL, async () => {
    return hookManager.uninstall();
  });

  ipcMain.handle(IPC.HOOK_STATUS, async () => {
    return hookManager.checkStatus();
  });

  // ---- Git handlers ----

  ipcMain.handle(IPC.GIT_STATUS, async (_event, sessionId: unknown) => {
    const id = validateString(sessionId, 'sessionId', 100);
    return gitStatusManager.getStatus(id);
  });

  // ---- Settings handlers ----

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return configManager.getSettings();
  });

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, settings: Partial<AppSettings>) => {
    return configManager.setSettings(settings);
  });

  // ---- Window handlers ----

  ipcMain.handle(IPC.WINDOW_MINIMIZE, async () => {
    win.minimize();
  });

  ipcMain.handle(IPC.WINDOW_MAXIMIZE, async () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return win.isMaximized();
  });

  ipcMain.handle(IPC.WINDOW_CLOSE, async () => {
    win.close();
  });

  ipcMain.handle(IPC.WINDOW_IS_MAXIMIZED, async () => {
    return win.isMaximized();
  });

  // ---- Task handlers ----

  ipcMain.handle(IPC.TASK_GET_ALL, async () => {
    return taskManager.getAllTasks();
  });

  ipcMain.handle(IPC.TASK_CREATE, async (_event, taskData: unknown) => {
    if (!taskData || typeof taskData !== 'object') throw new Error('Invalid task data');
    const td = taskData as Record<string, unknown>;
    return taskManager.createTask({
      title: validateString(td.title, 'title', 200),
      description: validateOptionalString(td.description, 'description', 5000) ?? '',
      status: validateOptionalString(td.status, 'status', 20) as Task['status'] | undefined,
      priority: validateOptionalString(td.priority, 'priority', 20) as Task['priority'] | undefined,
      assigneeSessionId: validateOptionalString(td.assigneeSessionId, 'assigneeSessionId', 100),
      tags: Array.isArray(td.tags)
        ? td.tags.filter((t): t is string => typeof t === 'string').slice(0, 20).map(t => t.slice(0, 50))
        : [],
    });
  });

  ipcMain.handle(IPC.TASK_UPDATE, async (_event, taskId: unknown, update: unknown) => {
    const id = validateString(taskId, 'taskId', 100);
    if (!update || typeof update !== 'object') throw new Error('Invalid task update');
    return taskManager.updateTask(id, update as Partial<Task>);
  });

  ipcMain.handle(IPC.TASK_DELETE, async (_event, taskId: unknown) => {
    const id = validateString(taskId, 'taskId', 100);
    return taskManager.deleteTask(id);
  });

  // ---- Activity handlers ----

  ipcMain.handle(IPC.ACTIVITY_GET_ALL, async () => {
    return taskManager.getAllActivities();
  });

  ipcMain.handle(IPC.ACTIVITY_PUSH, async (_event, activity: Omit<Activity, 'id' | 'timestamp'>) => {
    return taskManager.pushActivity(activity);
  });

  // ---- Sprint handlers ----

  ipcMain.handle(IPC.SPRINT_GET, async () => {
    const settings = configManager.getSettings();
    if (!settings.teamProjectPath) return null;
    return teamImporter.getSprintState(settings.teamProjectPath);
  });

  // ---- Team handlers ----

  ipcMain.handle(IPC.TEAM_IMPORT, async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Takim Projesi Dizini Sec',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const dirPath = result.filePaths[0];
    const importResult = teamImporter.importDirectory(dirPath);

    if (importResult) {
      // Save team project path
      configManager.setSettings({ teamProjectPath: dirPath });

      // Create team agent sessions
      for (const session of importResult.sessions) {
        sessionManager.createSession({
          name: session.name,
          agentType: session.agentType,
          location: 'local',
          cwd: dirPath,
          category: 'team',
        });
      }

      taskManager.pushActivity({
        type: 'sprint_update',
        description: `Takim projesi ice aktarildi: ${importResult.projectName}`,
        icon: '📂',
      });
    }

    return importResult;
  });

  ipcMain.handle(IPC.TEAM_GET_SPRINT, async (_event, dirPath: unknown) => {
    const path = validateString(dirPath, 'dirPath', 500);
    return teamImporter.getSprintState(path);
  });

  ipcMain.handle(IPC.TEAM_GET_SKILLS, async (_event, dirPath: unknown) => {
    const path = validateString(dirPath, 'dirPath', 500);
    return teamImporter.getSkills(path);
  });

  // ---- Push event wiring ----

  sessionManager.setOutputHandler((sessionId, data) => {
    if (typeof data === 'string') {
      send(IPC.SESSION_OUTPUT, sessionId, data);
    }
  });

  sessionManager.setStatusHandler((session) => {
    send(IPC.SESSION_STATUS, session);
  });

  sshManager.setOutputHandler((sessionId, data) => {
    if (typeof data === 'string') {
      send(IPC.SESSION_OUTPUT, sessionId, data);
    }
  });

  sshManager.setStatusHandler((session) => {
    send(IPC.SESSION_STATUS, session);
  });

  gitStatusManager.setUpdateHandler((sessionId, status) => {
    send(IPC.GIT_STATUS_UPDATE, sessionId, status);
  });

  // ---- Node handlers ----

  ipcMain.handle(IPC.NODE_GET_ALL, async () => {
    return nodeMonitor.getAllStatuses();
  });

  ipcMain.handle(IPC.NODE_REFRESH, async (_event, nodeId: unknown) => {
    const id = validateString(nodeId, 'nodeId', 10) as NodeId;
    return nodeMonitor.refreshNode(id);
  });

  ipcMain.handle(IPC.NODE_EXEC, async (_event, nodeId: unknown, command: unknown) => {
    const id = validateString(nodeId, 'nodeId', 10) as NodeId;
    const cmd = validateString(command, 'command', 2000);
    return nodeMonitor.executeCommand(id, cmd);
  });

  nodeMonitor.setStatusHandler((statuses) => {
    send(IPC.NODE_STATUS_UPDATE, statuses);
  });

  // ---- System handlers ----
  ipcMain.handle(IPC.SYSTEM_GET_HOME_DIR, async () => {
    return os.homedir();
  });

  hookManager.setEventHandler((event) => {
    send(IPC.HOOK_EVENT, event);

    // Update session status based on hook events
    if (event.type === 'pre_tool_use' || event.type === 'post_tool_use') {
      sessionManager.updateSessionStatus(event.sessionId, 'working');
    } else if (event.type === 'stop' || event.type === 'subagent_stop') {
      sessionManager.updateSessionStatus(event.sessionId, 'idle');
    } else if (event.type === 'user_prompt_submit') {
      sessionManager.updateSessionStatus(event.sessionId, 'waiting');
    }

    // Log hook event as activity
    taskManager.pushActivity({
      type: 'hook_event',
      description: `${event.type} - ${event.sessionId.slice(0, 8)}`,
      sessionId: event.sessionId,
      icon: '🔗',
    });
  });
}
