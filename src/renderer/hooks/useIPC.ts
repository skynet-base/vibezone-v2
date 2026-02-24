import { useEffect, useCallback } from 'react';
import { useSessionStore } from './useSessionStore';
import { useToastStore } from './useToastStore';
import type { Session, SessionConfig, SSHHost, GitStatus, AutocompleteResult, AppSettings, Task, HookEvent, NodeStatus } from '@shared/types';
import { IPC } from '@shared/types';

const api = () => window.electronAPI;

export function useIPC() {
  const store = useSessionStore();

  // Setup event listeners
  useEffect(() => {
    const handleOutput = (...args: unknown[]) => {
      // Output events are handled by TerminalManager directly
    };

    const handleStatus = (...args: unknown[]) => {
      const session = args[0] as Session;
      if (session?.id) {
        store.updateSession(session.id, { status: session.status, lastActivity: Date.now() });
      }
    };

    const handleGitUpdate = (...args: unknown[]) => {
      const [sessionId, gitStatus] = args as [string, GitStatus];
      store.setGitStatus(sessionId, gitStatus);
    };

    const handleHookEvent = (...args: unknown[]) => {
      const event = args[0] as HookEvent;
      if (event) {
        store.addActivity({
          id: event.id,
          type: 'hook_event',
          description: `${event.type}`,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          icon: '🔗',
        });
      }
    };

    const handleNodeUpdate = (...args: unknown[]) => {
      const statuses = args[0] as NodeStatus[];
      if (statuses) {
        store.setNodeStatuses(statuses);
      }
    };

    api().on(IPC.SESSION_OUTPUT, handleOutput);
    api().on(IPC.SESSION_STATUS, handleStatus);
    api().on(IPC.GIT_STATUS_UPDATE, handleGitUpdate);
    api().on(IPC.HOOK_EVENT, handleHookEvent);
    api().on(IPC.NODE_STATUS_UPDATE, handleNodeUpdate);

    return () => {
      api().off(IPC.SESSION_OUTPUT, handleOutput);
      api().off(IPC.SESSION_STATUS, handleStatus);
      api().off(IPC.GIT_STATUS_UPDATE, handleGitUpdate);
      api().off(IPC.HOOK_EVENT, handleHookEvent);
      api().off(IPC.NODE_STATUS_UPDATE, handleNodeUpdate);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      try {
        const [sessions, hosts, settings, tasks, activities] = await Promise.all([
          api().session.getAll(),
          api().ssh.getHosts(),
          api().settings.get(),
          api().task.getAll(),
          api().activity.getAll(),
        ]);
        store.setSessions(sessions);
        store.setSshHosts(hosts);
        store.setSettings(settings);
        store.setTasks(tasks);
        store.setActivities(activities);

        if (settings.teamProjectPath) {
          store.setTeamProjectPath(settings.teamProjectPath);
        }

        // Load sprint data
        try {
          const sprint = await api().sprint.get();
          if (sprint) store.setSprintState(sprint);
        } catch {
          // No sprint data
        }

        // Load node statuses
        try {
          const nodeStatuses = await api().node.getAll();
          if (nodeStatuses) store.setNodeStatuses(nodeStatuses);
        } catch {
          // Node monitoring not available
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    init();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip shortcuts when user is typing in input/textarea/select (Faz 6 fix)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+` (backtick) - toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        store.toggleTerminal();
        return;
      }

      // Ctrl+Shift+T - quick shell terminal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        quickCreateShell();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            store.setActiveView('office');
            break;
          case '2':
            e.preventDefault();
            store.setActiveView('tasks');
            break;
          case '3':
            e.preventDefault();
            store.setActiveView('dashboard');
            break;
          case '4':
            e.preventDefault();
            store.setActiveView('nodes');
            break;
          case 'n':
            e.preventDefault();
            store.setCreateAgentModalOpen(true);
            break;
          case 'Tab':
            e.preventDefault();
            const { sessions, activeSessionId } = useSessionStore.getState();
            if (sessions.length > 0) {
              const idx = sessions.findIndex(s => s.id === activeSessionId);
              const next = (idx + 1) % sessions.length;
              store.setActiveSession(sessions[next].id);
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Get home directory
  const getHomeDir = useCallback(async (): Promise<string> => {
    return api().system.getHomeDir();
  }, []);

  // Quick create shell terminal
  const quickCreateShell = useCallback(async () => {
    try {
      const homeDir = await api().system.getHomeDir();
      const { sessions } = useSessionStore.getState();
      const shellCount = sessions.filter(s => s.agentType === 'shell').length;
      const name = `Terminal-${shellCount + 1}`;
      const session = await api().session.create({
        name,
        agentType: 'shell',
        location: 'local',
        cwd: homeDir,
      });
      store.addSession(session);
      store.setActiveSession(session.id);
      if (!useSessionStore.getState().terminalOpen) {
        store.toggleTerminal();
      }
      useToastStore.getState().addToast({ message: `${name} baslatildi`, type: 'success' });
      return session;
    } catch (err: any) {
      useToastStore.getState().addToast({ message: `Hata: ${err?.message || 'Terminal olusturulamadi'}`, type: 'error' });
      return null;
    }
  }, []);

  // Session actions
  const createSession = useCallback(async (config: SessionConfig): Promise<Session> => {
    const session = await api().session.create(config);
    store.addSession(session);
    store.setActiveSession(session.id);
    useToastStore.getState().addToast({ message: `${session.name} baslatildi`, type: 'success' });
    return session;
  }, []);

  const killSession = useCallback(async (sessionId: string) => {
    const session = useSessionStore.getState().sessions.find(s => s.id === sessionId);
    await api().session.kill(sessionId);
    store.removeSession(sessionId);
    if (session) {
      useToastStore.getState().addToast({ message: `${session.name} durduruldu`, type: 'info' });
    }
  }, []);

  const sendInput = useCallback(async (sessionId: string, data: string) => {
    await api().session.sendInput(sessionId, data);
  }, []);

  const resizeSession = useCallback(async (sessionId: string, cols: number, rows: number) => {
    await api().session.resize(sessionId, cols, rows);
  }, []);

  const restartSession = useCallback(async (sessionId: string): Promise<Session> => {
    const session = await api().session.restart(sessionId);
    store.updateSession(sessionId, session);
    return session;
  }, []);

  const getSessionOutput = useCallback(async (sessionId: string): Promise<string> => {
    return api().session.getOutput(sessionId);
  }, []);

  // SSH actions
  const addSshHost = useCallback(async (host: Omit<SSHHost, 'id' | 'isManual'>): Promise<SSHHost> => {
    const newHost = await api().ssh.addHost(host);
    store.addSshHost(newHost);
    return newHost;
  }, []);

  const removeSshHost = useCallback(async (hostId: string) => {
    await api().ssh.removeHost(hostId);
    store.removeSshHost(hostId);
  }, []);

  const testSshHost = useCallback(async (hostId: string) => {
    return api().ssh.test(hostId);
  }, []);

  // Projects
  const autocomplete = useCallback(async (query: string): Promise<AutocompleteResult[]> => {
    return api().projects.autocomplete(query);
  }, []);

  // Hook
  const setupHook = useCallback(async () => {
    return api().hook.setup();
  }, []);

  const uninstallHook = useCallback(async () => {
    return api().hook.uninstall();
  }, []);

  const getHookStatus = useCallback(async () => {
    return api().hook.status();
  }, []);

  // Settings
  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    await api().settings.set(settings);
    const updated = await api().settings.get();
    store.setSettings(updated);
  }, []);

  // Git
  const getGitStatus = useCallback(async (sessionId: string) => {
    const status = await api().git.status(sessionId);
    if (status) {
      store.setGitStatus(sessionId, status);
    }
    return status;
  }, []);

  // Task actions
  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    const task = await api().task.create(taskData);
    store.addTask(task);
    return task;
  }, []);

  const updateTaskIPC = useCallback(async (taskId: string, update: Partial<Task>): Promise<Task> => {
    const task = await api().task.update(taskId, update);
    store.updateTask(taskId, task);
    return task;
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await api().task.delete(taskId);
    store.removeTask(taskId);
  }, []);

  // Team actions
  const importTeam = useCallback(async () => {
    const result = await api().team.import();
    if (result) {
      const sessions = await api().session.getAll();
      store.setSessions(sessions);
      if (result.sprintState) {
        store.setSprintState(result.sprintState);
      }
    }
    return result;
  }, []);

  // Window
  const minimizeWindow = useCallback(() => api().window.minimize(), []);
  const maximizeWindow = useCallback(() => api().window.maximize(), []);
  const closeWindow = useCallback(() => api().window.close(), []);

  return {
    createSession,
    killSession,
    sendInput,
    resizeSession,
    restartSession,
    getSessionOutput,
    getHomeDir,
    quickCreateShell,
    addSshHost,
    removeSshHost,
    testSshHost,
    autocomplete,
    setupHook,
    uninstallHook,
    getHookStatus,
    updateSettings,
    getGitStatus,
    createTask,
    updateTask: updateTaskIPC,
    deleteTask,
    importTeam,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
  };
}
