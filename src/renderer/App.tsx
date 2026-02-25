import React, { Suspense, lazy, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from './components/Layout/TopBar';
import { Sidebar } from './components/Layout/Sidebar';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { CreateAgentModal } from './components/Modals/CreateAgentModal';
import { SSHHostModal } from './components/Modals/SSHHostModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ToastContainer } from './components/Toast/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingTooltip } from './components/UI/OnboardingTooltip';
import { PanelInfoButton } from './components/UI/PanelInfoButton';
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
  const terminalOpen = useSessionStore((s) => s.terminalOpen);
  const terminalHeight = useSessionStore((s) => s.terminalHeight);
  const sidebarWidth = useSessionStore((s) => s.sidebarWidth);
  const sidebarCollapsed = useSessionStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSessionStore((s) => s.setSidebarCollapsed);
  const createModalOpen = useSessionStore((s) => s.createAgentModalOpen);
  const settingsOpen = useSessionStore((s) => s.settingsModalOpen);
  const sshModalOpen = useSessionStore((s) => s.sshHostModalOpen);

  // Auto-collapse sidebar on small windows
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // check on mount
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  const effectiveSidebarWidth = sidebarCollapsed ? 60 : sidebarWidth;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-vz-bg">
      {/* Top bar (frameless titlebar) */}
      <TopBar />

      {/* Main content area - Bento Grid Setup */}
      <div className="flex-1 w-full p-4 overflow-hidden no-drag">

        {/* The Bento Container */}
        <div className="w-full h-full grid gap-4" style={{
          gridTemplateColumns: `${effectiveSidebarWidth}px 1fr`,
          gridTemplateRows: terminalOpen ? `1fr ${terminalHeight}px` : '1fr',
          gridTemplateAreas: terminalOpen ? `
            "sidebar main"
            "sidebar terminal"
          ` : `"sidebar main"`,
          transition: 'grid-template-columns 0.3s ease',
        }}>

          {/* Bento Cell: Sidebar */}
          <div className="glass-2 rounded-2xl overflow-hidden flex" style={{ gridArea: 'sidebar' }}>
            <OnboardingTooltip id="add-agent" message="Yeni bir AI asistan veya terminal baslatmak icin tiklayin" position="right" delay={1000}>
              <Sidebar />
            </OnboardingTooltip>
          </div>

          {/* Bento Cell: Main Content (Tabs + View) */}
          <div className="glass-2 rounded-2xl flex flex-col overflow-hidden relative group" style={{ gridArea: 'main' }}>

            {/* Mesh Glow overlay for active bento cell */}
            <div className="absolute inset-0 bg-mesh-glow opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0"></div>

            {/* Tab bar */}
            <OnboardingTooltip id="tab-bar" message="Farkli gorunumler arasinda gecis yapin: Sahne, Gorevler, Dashboard, Altyapi" position="bottom" delay={3000}>
              <div className="relative z-10 flex items-center gap-2 px-4 py-3 bg-vz-surface-2/40 backdrop-blur-md border-b border-vz-border/50">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-display transition-all duration-300 ${activeView === tab.id
                        ? 'bg-vz-cyan/10 text-vz-cyan neon-border-cyan'
                        : 'bg-vz-surface/50 text-vz-muted hover:text-vz-text hover:bg-vz-surface-2'
                      }`}
                  >
                    <TabIcon tabId={tab.id} active={activeView === tab.id} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {activeView === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent, #00ccff, transparent)' }}
                      />
                    )}
                  </button>
                ))}
                <PanelInfoButton
                  title={TAB_CONFIG.find(t => t.id === activeView)?.label || ''}
                  shortcut={`Ctrl+${TAB_CONFIG.findIndex(t => t.id === activeView) + 1}`}
                  description={
                    activeView === 'office' ? '3D agent sahnesini goruntuleyin' :
                    activeView === 'tasks' ? 'Gorev panosu ve yapay zeka destekli gorev yonetimi' :
                    activeView === 'dashboard' ? 'Sistem dashboardu ve performans metrikleri' :
                    'Altyapi ve sunucu yonetimi'
                  }
                />
              </div>
            </OnboardingTooltip>

            {/* Active view */}
            <div className="flex-1 relative z-10 overflow-hidden">
              <Suspense fallback={<ViewFallback />}>
                {activeView === 'office' && <ErrorBoundary><CyberScene /></ErrorBoundary>}
                {activeView === 'tasks' && <ErrorBoundary><TaskBoard /></ErrorBoundary>}
                {activeView === 'dashboard' && <ErrorBoundary><DashboardView /></ErrorBoundary>}
                {activeView === 'nodes' && <ErrorBoundary><NodesView /></ErrorBoundary>}
              </Suspense>
            </div>
          </div>

          {/* Bento Cell: Terminal */}
          {terminalOpen && (
          <div className="glass-2 rounded-2xl overflow-hidden shadow-glass-inner" style={{ gridArea: 'terminal' }}>
            <OnboardingTooltip id="terminal" message="Terminal acmak icin Ctrl+Shift+T, kapamak icin Ctrl+` kullanin" position="top" delay={5000}>
              <TerminalPanel />
            </OnboardingTooltip>
          </div>
          )}

        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {createModalOpen ? <CreateAgentModal /> : null}
      </AnimatePresence>
      <AnimatePresence>
        {settingsOpen ? <SettingsModal /> : null}
      </AnimatePresence>
      <AnimatePresence>
        {sshModalOpen ? <SSHHostModal /> : null}
      </AnimatePresence>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
};

export default App;
