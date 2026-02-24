import React, { Suspense, lazy } from 'react';
import { TopBar } from './components/Layout/TopBar';
import { Sidebar } from './components/Layout/Sidebar';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { CreateAgentModal } from './components/Modals/CreateAgentModal';
import { SSHHostModal } from './components/Modals/SSHHostModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ToastContainer } from './components/Toast/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useIPC } from './hooks/useIPC';
import { useSessionStore } from './hooks/useSessionStore';

// Lazy load heavy components
const CyberScene = lazy(() =>
  import('./components/CyberScene/CyberScene').then((m) => ({ default: m.CyberScene }))
);
const TaskBoard = lazy(() =>
  import('./components/TaskBoard/TaskBoard').then((m) => ({ default: m.TaskBoard }))
);
const DashboardView = lazy(() =>
  import('./components/Dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const NodesView = lazy(() =>
  import('./components/Nodes/NodesView').then((m) => ({ default: m.NodesView }))
);

const ViewFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-vz-bg">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-vz-cyan/30 border-t-vz-cyan rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs text-vz-muted">Yukleniyor...</p>
    </div>
  </div>
);

const TAB_CONFIG = [
  { id: 'office' as const, label: 'Sahne' },
  { id: 'tasks' as const, label: 'Gorevler' },
  { id: 'dashboard' as const, label: 'Dashboard' },
  { id: 'nodes' as const, label: 'Altyapi' },
];

// SVG tab icons
const TabIcon: React.FC<{ tabId: string; active: boolean }> = ({ tabId, active }) => {
  const color = active ? '#00ccff' : '#666680';
  const size = 14;

  switch (tabId) {
    case 'office':
      // Hexagon
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" stroke={color} strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'tasks':
      // Kanban columns
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="5" height="14" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="10" y="3" width="5" height="10" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="17" y="3" width="5" height="18" rx="1" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'dashboard':
      // Grid
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'nodes':
      // Network/server icon
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
          <rect x="9" y="14" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
          <path d="M7 10v2l5 2M17 10v2l-5 2" stroke={color} strokeWidth="1" strokeDasharray="2 1" />
        </svg>
      );
    default:
      return null;
  }
};

const App: React.FC = () => {
  useIPC();
  const activeView = useSessionStore((s) => s.activeView);
  const setActiveView = useSessionStore((s) => s.setActiveView);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-vz-bg">
      {/* Top bar (frameless titlebar) */}
      <TopBar />

      {/* Main content area - no-drag ensures all child elements are interactive */}
      <div className="flex flex-1 overflow-hidden no-drag">
        {/* Left sidebar */}
        <Sidebar />

        {/* Center area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-vz-surface/30 backdrop-blur-sm border-b border-vz-border/50">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-1.5 text-sm font-display transition-all ${
                  activeView === tab.id
                    ? 'text-vz-cyan'
                    : 'text-vz-muted hover:text-vz-text'
                }`}
              >
                <TabIcon tabId={tab.id} active={activeView === tab.id} />
                <span>{tab.label}</span>
                {activeView === tab.id && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #00ccff, #8b5cf6)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Active view */}
          <div className="flex-1 relative overflow-hidden">
            <Suspense fallback={<ViewFallback />}>
              {activeView === 'office' && <ErrorBoundary><CyberScene /></ErrorBoundary>}
              {activeView === 'tasks' && <ErrorBoundary><TaskBoard /></ErrorBoundary>}
              {activeView === 'dashboard' && <ErrorBoundary><DashboardView /></ErrorBoundary>}
              {activeView === 'nodes' && <ErrorBoundary><NodesView /></ErrorBoundary>}
            </Suspense>
          </div>
        </div>
      </div>

      {/* Bottom: Terminal + Chat panel */}
      <TerminalPanel />

      {/* Modals */}
      <CreateAgentModal />
      <SSHHostModal />
      <SettingsModal />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
};

export default App;
