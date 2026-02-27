import React, { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TopBar } from './components/Layout/TopBar';
import { LeftNav } from './components/Layout/LeftNav';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { CreateAgentModal } from './components/Modals/CreateAgentModal';
import { SSHHostModal } from './components/Modals/SSHHostModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ToastContainer } from './components/Toast/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { ConfirmModal } from './components/UI/ConfirmModal';
import { useIPC } from './hooks/useIPC';
import { useHotkeys } from './hooks/useHotkeys';
import { useSessionStore } from './hooks/useSessionStore';

// Lazy views
const TaskBoard = lazy(() =>
  import('./components/TaskBoard/TaskBoard').then((m) => ({ default: m.TaskBoard }))
);
const DashboardView = lazy(() =>
  import('./components/Dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const NodesView = lazy(() =>
  import('./components/Nodes/NodesView').then((m) => ({ default: m.NodesView }))
);
const RightSidebar = lazy(() =>
  import('./components/Layout/RightSidebar').then((m) => ({ default: m.RightSidebar }))
);

const ViewFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-vz-bg">
    <div className="w-6 h-6 border-2 border-vz-cyan/30 border-t-vz-cyan rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  useIPC();
  useHotkeys();
  const activeView = useSessionStore((s) => s.activeView);
  const terminalHeight = useSessionStore((s) => s.terminalHeight);
  const rightSidebarOpen = useSessionStore((s) => s.rightSidebarOpen);
  const confirmModal = useSessionStore((s) => s.confirmModal);
  const hideConfirm = useSessionStore((s) => s.hideConfirm);
  const createModalOpen = useSessionStore((s) => s.createAgentModalOpen);
  const settingsOpen = useSessionStore((s) => s.settingsModalOpen);
  const sshModalOpen = useSessionStore((s) => s.sshHostModalOpen);

  useEffect(() => {
    ['dashboard', 'nodes', 'tasks'].forEach((key) => {
      localStorage.removeItem(`vz-layout-${key}`);
    });
  }, []);

  const rightW = rightSidebarOpen ? 220 : 0;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-vz-bg">
      {/* TopBar */}
      <TopBar />

      {/* 3-column body */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `60px 1fr ${rightW}px`,
          gridTemplateRows: `1fr ${terminalHeight}px`,
          gridTemplateAreas: `
            "leftnav main rightsidebar"
            "leftnav terminal rightsidebar"
          `,
          transition: 'grid-template-columns 0.25s ease',
        }}
      >
        {/* Left Nav */}
        <div style={{ gridArea: 'leftnav' }} className="border-r border-vz-border/50">
          <LeftNav />
        </div>

        {/* Main content */}
        <div style={{ gridArea: 'main' }} className="overflow-hidden flex flex-col">
          <Suspense fallback={<ViewFallback />}>
            {activeView === 'tasks' && <ErrorBoundary><TaskBoard /></ErrorBoundary>}
            {activeView === 'dashboard' && <ErrorBoundary><DashboardView /></ErrorBoundary>}
            {activeView === 'nodes' && <ErrorBoundary><NodesView /></ErrorBoundary>}
            {activeView === 'terminal' && (
              <div className="flex-1 flex items-center justify-center text-vz-muted/30 text-sm font-mono select-none">
                terminal aktif ↓
              </div>
            )}
          </Suspense>
        </div>

        {/* Terminal — always mounted */}
        <div
          style={{ gridArea: 'terminal' }}
          className="border-t border-vz-border/50"
        >
          <TerminalPanel />
        </div>

        {/* Right Sidebar */}
        {rightSidebarOpen && (
          <div
            style={{ gridArea: 'rightsidebar' }}
            className="border-l border-vz-border/50 overflow-hidden"
          >
            <Suspense fallback={<div className="w-full h-full bg-vz-bg" />}>
              <RightSidebar />
            </Suspense>
          </div>
        )}
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
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={() => hideConfirm(true)}
        onCancel={() => hideConfirm(false)}
      />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
};

export default App;
