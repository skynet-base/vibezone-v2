import { create } from 'zustand';
import type { Session, SSHHost, AppSettings, GitStatus, Task, Activity, SprintState, NodeStatus, ChatMessage } from '@shared/types';

export type ActiveView = 'office' | 'tasks' | 'dashboard' | 'nodes';

interface SessionStore {
  // Sessions
  sessions: Session[];
  activeSessionId: string | null;
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, update: Partial<Session>) => void;
  setActiveSession: (sessionId: string | null) => void;
  setSessions: (sessions: Session[]) => void;

  // Active view
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Terminal
  terminalOpen: boolean;
  terminalHeight: number;
  sidebarWidth: number;
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;

  // SSH Hosts
  sshHosts: SSHHost[];
  setSshHosts: (hosts: SSHHost[]) => void;
  addSshHost: (host: SSHHost) => void;
  removeSshHost: (hostId: string) => void;

  // Settings
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;

  // Git
  gitStatuses: Map<string, GitStatus>;
  setGitStatus: (sessionId: string, status: GitStatus) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, update: Partial<Task>) => void;
  removeTask: (taskId: string) => void;

  // Activities
  activities: Activity[];
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;

  // Sprint
  sprintState: SprintState | null;
  setSprintState: (sprint: SprintState | null) => void;

  // Team
  teamProjectPath: string | null;
  setTeamProjectPath: (path: string | null) => void;

  // Nodes
  nodeStatuses: NodeStatus[];
  setNodeStatuses: (statuses: NodeStatus[]) => void;

  // Chat
  chatMessages: Map<string, ChatMessage[]>;
  chatOpen: boolean;
  addChatMessage: (sessionId: string, msg: ChatMessage) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;

  // Modals
  createAgentModalOpen: boolean;
  sshHostModalOpen: boolean;
  settingsModalOpen: boolean;
  setCreateAgentModalOpen: (open: boolean) => void;
  setSshHostModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  // Sessions
  sessions: [],
  activeSessionId: null,
  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),
  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
    })),
  updateSession: (sessionId, update) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...update } : s
      ),
    })),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  setSessions: (sessions) => set({ sessions }),

  // Active view
  activeView: 'office',
  setActiveView: (view) => set({ activeView: view }),

  // Terminal
  terminalOpen: false,
  terminalHeight: 350,
  sidebarWidth: 240,
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  setTerminalHeight: (height) => set({ terminalHeight: height }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  // SSH Hosts
  sshHosts: [],
  setSshHosts: (hosts) => set({ sshHosts: hosts }),
  addSshHost: (host) =>
    set((state) => ({ sshHosts: [...state.sshHosts, host] })),
  removeSshHost: (hostId) =>
    set((state) => ({
      sshHosts: state.sshHosts.filter((h) => h.id !== hostId),
    })),

  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),

  // Git
  gitStatuses: new Map(),
  setGitStatus: (sessionId, status) =>
    set((state) => {
      const newMap = new Map(state.gitStatuses);
      newMap.set(sessionId, status);
      return { gitStatuses: newMap };
    }),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskId, update) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...update } : t
      ),
    })),
  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),

  // Activities
  activities: [],
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) =>
    set((state) => ({ activities: [activity, ...state.activities].slice(0, 500) })),

  // Sprint
  sprintState: null,
  setSprintState: (sprint) => set({ sprintState: sprint }),

  // Team
  teamProjectPath: null,
  setTeamProjectPath: (path) => set({ teamProjectPath: path }),

  // Nodes
  nodeStatuses: [],
  setNodeStatuses: (statuses) => set({ nodeStatuses: statuses }),

  // Chat
  chatMessages: new Map(),
  chatOpen: false,
  addChatMessage: (sessionId, msg) =>
    set((state) => {
      const newMap = new Map(state.chatMessages);
      const existing = newMap.get(sessionId) || [];
      newMap.set(sessionId, [...existing, msg].slice(-200));
      return { chatMessages: newMap };
    }),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),

  // Modals
  createAgentModalOpen: false,
  sshHostModalOpen: false,
  settingsModalOpen: false,
  setCreateAgentModalOpen: (open) => set({ createAgentModalOpen: open }),
  setSshHostModalOpen: (open) => set({ sshHostModalOpen: open }),
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
}));
