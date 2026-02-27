# VibeZone v3 — Implementation Plan
> **For Claude:** Use `subagent-driven-development` or `executing-plans` to implement.

**Goal:** Terminal-first AI agent workspace with Warp-like terminal, compact 3D chibi robot sidebar, multi-PC agent visualization, task queue, and PC health dashboard — replacing all isometric code.

**Architecture:** 3-column CSS grid layout (60px LeftNav | 1fr Main | 220px RightSidebar). Terminal lives permanently at bottom dock (always visible, `display:none` but never destroyed). Right sidebar has 3 stacked sections: CompactScene (R3F, 220px tall) → TaskQueuePanel (flex) → PCHealthMini (80px).

**Tech Stack:** Electron 33, React 18, TypeScript 5.6, Three.js 0.183 + @react-three/fiber 8.18 + @react-three/drei 9.122, xterm.js 5.5, Zustand 5, Framer Motion 11, Tailwind 3.4. **No new packages needed.**

**Design Spec:** `docs/plans/2026-02-26-vibezone-v3-redesign.md`

---

## Phase 1 — Isometric Cleanup + Layout Skeleton
**Goal:** App opens. Isometric code gone. New 3-column grid in place. Terminal always visible.

### Task 1.1 — Delete all isometric files
```bash
# Run from: C:/Users/TR/Desktop/vibezone-v2-fresh
cd src/renderer/components/CyberScene
rm -f CyberScene.tsx isoUtils.ts DataColumns.tsx Platform.tsx CommandRing.tsx \
       WorkingEffects.tsx AgentConnections.tsx AgentOrbs.tsx AgentOrb.tsx \
       AmbientParticles.tsx CameraController.tsx EnergyConnections.tsx \
       PostEffects.tsx shaders/gridFloor.ts hooks/useAgentConnections.ts \
       hooks/useAgentPositions.ts
cd ../Nodes && rm -f IsometricNodesScene.tsx
```
**Expected:** Files gone. Build will have errors (fixed in Task 1.2).

### Task 1.2 — Update useSessionStore: new ActiveView + terminal always on
**File:** `src/renderer/hooks/useSessionStore.ts`

Change line 4:
```ts
// OLD
export type ActiveView = 'office' | 'tasks' | 'dashboard' | 'nodes';
// NEW
export type ActiveView = 'terminal' | 'tasks' | 'dashboard' | 'nodes';
```

In the store object, change:
```ts
// OLD
activeView: (localStorage.getItem('vz-activeView') as ActiveView) || 'office',
terminalOpen: false,

// NEW
activeView: (localStorage.getItem('vz-activeView') as ActiveView) || 'terminal',
terminalOpen: true,   // always on
```

Add new state fields after `sidebarCollapsed`:
```ts
// Right sidebar
rightSidebarOpen: localStorage.getItem('vz-rightSidebar') !== 'false',
setRightSidebarOpen: (open: boolean) => void,
```

Add to interface (after `setSidebarCollapsed` line):
```ts
rightSidebarOpen: boolean;
setRightSidebarOpen: (open: boolean) => void;
```

Add to store implementation (after `setSidebarCollapsed` impl):
```ts
rightSidebarOpen: localStorage.getItem('vz-rightSidebar') !== 'false',
setRightSidebarOpen: (open) => {
  localStorage.setItem('vz-rightSidebar', String(open));
  set({ rightSidebarOpen: open });
},
```

**Commit:** `chore: useSessionStore v3 — terminal always-on, rightSidebarOpen`

### Task 1.3 — Rewrite App.tsx with 3-column grid
**File:** `src/renderer/App.tsx`

Replace entire file with:
```tsx
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
            {/* terminal view = empty, terminal panel below handles it */}
            {activeView === 'terminal' && (
              <div className="flex-1 flex items-center justify-center text-vz-muted/30 text-sm font-mono select-none">
                terminal aktif ↓
              </div>
            )}
          </Suspense>
        </div>

        {/* Terminal — always mounted, display swaps */}
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
```

**Commit:** `feat: App.tsx v3 — 3-column grid layout, terminal always-on`

### Task 1.4 — Create LeftNav.tsx (placeholder)
**File:** `src/renderer/components/Layout/LeftNav.tsx`

```tsx
import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { ActiveView } from '../../hooks/useSessionStore';
import { AGENT_INFO, AGENT_COLORS } from '@shared/types';

const NAV_ITEMS: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
  {
    id: 'terminal',
    label: 'Terminal (Ctrl+1)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Görevler (Ctrl+2)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="14" rx="1" />
        <rect x="10" y="3" width="5" height="10" rx="1" />
        <rect x="17" y="3" width="5" height="18" rx="1" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard (Ctrl+3)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    id: 'nodes',
    label: 'Altyapı (Ctrl+4)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="9" y="14" width="6" height="6" rx="1" />
        <path d="M7 10v2l5 2M17 10v2l-5 2" strokeDasharray="2 1" />
      </svg>
    ),
  },
];

const STATUS_COLORS: Record<string, string> = {
  idle: '#00ff88',
  working: '#00ccff',
  waiting: '#f59e0b',
  offline: '#6b7280',
};

export const LeftNav: React.FC = () => {
  const activeView = useSessionStore((s) => s.activeView);
  const setActiveView = useSessionStore((s) => s.setActiveView);
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const setCreateAgentModalOpen = useSessionStore((s) => s.setCreateAgentModalOpen);
  const { quickCreateShell } = require('../../hooks/useIPC').useIPC
    ? { quickCreateShell: () => {} }
    : { quickCreateShell: () => {} };

  return (
    <div className="h-full w-[60px] flex flex-col items-center py-2 bg-vz-bg select-none">
      {/* Logo */}
      <div className="mb-3 flex items-center justify-center w-10 h-10">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z"
            stroke="#00ccff" strokeWidth="1.5" fill="none"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,204,255,0.6))' }} />
        </svg>
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-vz-border mb-2" />

      {/* Nav items */}
      <div className="flex flex-col gap-1 items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={item.label}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 group"
              style={{
                backgroundColor: isActive ? 'rgba(0,204,255,0.12)' : 'transparent',
                color: isActive ? '#00ccff' : '#555578',
                boxShadow: isActive ? 'inset 2px 0 0 #00ccff, 0 0 12px rgba(0,204,255,0.15)' : 'none',
              }}
            >
              {item.icon}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded text-[11px] font-mono
                bg-vz-surface-2 border border-vz-border text-vz-text whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity
                shadow-lg">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-vz-border my-2" />

      {/* Agent dots */}
      <div className="flex flex-col gap-1.5 items-center flex-1 overflow-y-auto py-1">
        {sessions.map((session) => {
          const color = AGENT_COLORS[session.agentType] || '#555578';
          const isActive = activeSessionId === session.id;
          const isWorking = session.status === 'working';
          const statusColor = STATUS_COLORS[session.status] || '#6b7280';
          return (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              title={`${session.name} · ${session.status}`}
              className="relative w-8 h-8 rounded-full flex items-center justify-center group transition-all"
              style={{
                backgroundColor: `${color}18`,
                border: `1.5px solid ${isActive ? color : color + '40'}`,
                boxShadow: isActive ? `0 0 10px ${color}50` : 'none',
              }}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {/* Status micro dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-vz-bg"
                style={{ backgroundColor: statusColor }}
              />
              {/* Working pulse */}
              {isWorking && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: color }}
                />
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded text-[11px] font-mono
                bg-vz-surface-2 border border-vz-border text-vz-text whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                {session.name} · {session.status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 items-center mt-2">
        <button
          onClick={() => setCreateAgentModalOpen(true)}
          title="Agent Ekle"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-vz-cyan/60 hover:text-vz-cyan hover:bg-vz-cyan/10 transition-all border border-vz-cyan/20 hover:border-vz-cyan/40"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={() => useSessionStore.getState().setSettingsModalOpen(true)}
          title="Ayarlar"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-vz-muted hover:text-vz-text hover:bg-vz-surface-2 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
```

**Commit:** `feat: LeftNav.tsx — 60px icon nav with agent dots`

### Task 1.5 — Create RightSidebar.tsx (placeholder shell)
**File:** `src/renderer/components/Layout/RightSidebar.tsx`

```tsx
import React from 'react';

export const RightSidebar: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-vz-bg overflow-hidden">
      {/* Scene placeholder */}
      <div
        className="flex-shrink-0 flex items-center justify-center border-b border-vz-border/50"
        style={{ height: 220 }}
      >
        <span className="text-vz-muted/30 text-xs font-mono">3D sahne yakında</span>
      </div>

      {/* Task queue placeholder */}
      <div className="flex-1 flex items-center justify-center border-b border-vz-border/50">
        <span className="text-vz-muted/30 text-xs font-mono">görev kuyruğu</span>
      </div>

      {/* PC health placeholder */}
      <div className="flex-shrink-0" style={{ height: 80 }}>
        <div className="h-full flex items-center justify-center">
          <span className="text-vz-muted/30 text-[10px] font-mono">PC sağlık</span>
        </div>
      </div>
    </div>
  );
};
```

### Task 1.6 — Fix useHotkeys for new view names
**File:** `src/renderer/hooks/useHotkeys.ts`

Find `'office'` and replace with `'terminal'`:
```ts
// Find: setActiveView('office')  → Replace with: setActiveView('terminal')
// Find: case '1': setActiveView('office')  → case '1': setActiveView('terminal')
```

### Task 1.7 — Verify build passes
```bash
cd C:/Users/TR/Desktop/vibezone-v2-fresh
npm run typecheck
# Expected: 0 errors
npm run build
# Expected: successful build
```

**Commit:** `feat: Phase 1 complete — v3 layout skeleton, isometric removed`

---

## Phase 2 — Terminal UX Overhaul (Warp-like)
**Goal:** Terminal is large, beautiful, Warp-like with colored tabs, info bar, status bar.

### Task 2.1 — Update xterm.js theme
**File:** `src/renderer/components/Terminal/TerminalManager.ts`

Find the `Terminal` constructor options and update/add theme:
```ts
const theme: ITheme = {
  background:    '#020205',
  foreground:    '#EEEEF8',
  black:         '#1A1A35',
  brightBlack:   '#3A3A5C',
  red:           '#FF3B5C',
  brightRed:     '#FF5577',
  green:         '#00FF88',
  brightGreen:   '#33FFAA',
  yellow:        '#F59E0B',
  brightYellow:  '#FFB800',
  blue:          '#4488FF',
  brightBlue:    '#60A5FA',
  magenta:       '#8B5CF6',
  brightMagenta: '#A78BFA',
  cyan:          '#00CCFF',
  brightCyan:    '#00F0FF',
  white:         '#C8C8E8',
  brightWhite:   '#EEEEF8',
  cursor:        '#00CCFF',
  cursorAccent:  '#020205',
  selectionBackground: 'rgba(0,204,255,0.2)',
};
```

### Task 2.2 — Extract TerminalTabBar component
**File:** `src/renderer/components/Terminal/TerminalTabBar.tsx`

```tsx
import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { AGENT_COLORS, AGENT_INFO } from '@shared/types';

const STATUS_COLORS: Record<string, string> = {
  idle: '#00ff88', working: '#00ccff', waiting: '#f59e0b', offline: '#6b7280',
};

export const TerminalTabBar: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const { quickCreateShell, killSession } = useIPC();

  return (
    <div
      className="flex items-center h-8 bg-vz-surface-2/60 overflow-x-auto flex-shrink-0 border-b border-vz-border/50"
      style={{ minHeight: 32 }}
    >
      {sessions.map((session) => {
        const agentColor = AGENT_COLORS[session.agentType] || '#5a5a78';
        const isActive = activeSessionId === session.id;
        const statusColor = STATUS_COLORS[session.status] || '#6b7280';

        return (
          <button
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className="group flex items-center gap-1.5 px-3 h-full text-[11px] font-mono
              whitespace-nowrap flex-shrink-0 transition-all duration-150 relative"
            style={isActive ? {
              backgroundColor: `${agentColor}15`,
              borderTop: `2px solid ${agentColor}`,
              borderBottom: '2px solid transparent',
              color: agentColor,
            } : {
              backgroundColor: 'transparent',
              borderTop: '2px solid transparent',
              borderBottom: '2px solid transparent',
              color: '#555578',
            }}
          >
            {/* Status dot */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: statusColor,
                boxShadow: isActive ? `0 0 5px ${statusColor}` : 'none',
              }}
            />
            {/* Name */}
            <span className={isActive ? '' : 'group-hover:text-vz-text transition-colors'}>
              {session.name}
            </span>
            {/* Close */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); killSession(session.id); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), killSession(session.id))}
              className="ml-0.5 w-3 h-3 rounded flex items-center justify-center
                opacity-0 group-hover:opacity-60 hover:!opacity-100
                hover:bg-red-500/30 text-vz-muted hover:text-red-400 transition-all"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* New terminal */}
      <button
        onClick={quickCreateShell}
        title="Yeni Terminal (Ctrl+T)"
        className="flex-shrink-0 w-8 h-full flex items-center justify-center
          text-vz-muted hover:text-vz-green hover:bg-vz-green/10 transition-all"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
```

### Task 2.3 — Create TerminalInfoBar component
**File:** `src/renderer/components/Terminal/TerminalInfoBar.tsx`

```tsx
import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { AGENT_COLORS } from '@shared/types';
import { NODE_CONFIG } from '@shared/types';

const STATUS_COLORS: Record<string, string> = {
  idle: '#00ff88', working: '#00ccff', waiting: '#f59e0b', offline: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'BOSTA', working: 'ÇALIŞIYOR', waiting: 'BEKLİYOR', offline: 'KAPALI',
};

function truncateCwd(cwd: string, max = 40): string {
  if (cwd.length <= max) return cwd;
  const parts = cwd.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return '...' + cwd.slice(-max + 3);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
}

export const TerminalInfoBar: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const session = sessions.find((s) => s.id === activeSessionId);

  if (!session) return null;

  const agentColor = AGENT_COLORS[session.agentType] || '#5a5a78';
  const statusColor = STATUS_COLORS[session.status] || '#6b7280';
  const statusLabel = STATUS_LABELS[session.status] || session.status.toUpperCase();
  const isWorking = session.status === 'working';

  const pcNode = session.sshHost
    ? NODE_CONFIG.find((n) => n.sshAlias === session.sshHost)
    : NODE_CONFIG.find((n) => n.sshAlias === null);

  return (
    <div
      className="flex items-center h-7 px-3 gap-3 flex-shrink-0 border-b border-vz-border/30"
      style={{ backgroundColor: 'rgba(13,13,34,0.6)' }}
    >
      {/* Status */}
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: statusColor,
            boxShadow: `0 0 5px ${statusColor}`,
            animation: isWorking ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: statusColor }}
        >
          {statusLabel}
        </span>
      </span>

      <span className="w-px h-3 bg-vz-border/60 flex-shrink-0" />

      {/* Agent name */}
      <span
        className="text-[11px] font-mono font-medium flex-shrink-0"
        style={{ color: agentColor }}
      >
        {session.name}
      </span>

      <span className="w-px h-3 bg-vz-border/60 flex-shrink-0" />

      {/* CWD */}
      <span className="text-[11px] font-mono text-vz-muted/70 hover:text-vz-muted transition-colors truncate flex-1 min-w-0">
        {truncateCwd(session.cwd)}
      </span>

      {/* PC Badge */}
      {pcNode && (
        <span
          className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest"
          style={{
            color: pcNode.color,
            backgroundColor: `${pcNode.color}15`,
            border: `1px solid ${pcNode.color}30`,
          }}
        >
          {pcNode.name}
        </span>
      )}
    </div>
  );
};
```

### Task 2.4 — Refactor TerminalPanel.tsx (use new sub-components)
**File:** `src/renderer/components/Terminal/TerminalPanel.tsx`

Replace the tab bar section (lines 276-380) with:
```tsx
{/* Import at top */}
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalInfoBar } from './TerminalInfoBar';
```

In the JSX, replace the old tab bar div and info bar with:
```tsx
{/* Tab bar */}
<TerminalTabBar />

{/* Info bar — show when session active */}
{activeSession && <TerminalInfoBar />}
```

Remove the old inline tab rendering and info bar.

**Commit:** `feat: Terminal UX — TerminalTabBar, TerminalInfoBar, new xterm theme`

### Task 2.5 — Update CSS variables in index.css
**File:** `src/renderer/index.css`

Add to `:root` block:
```css
/* v3 additions */
--vz-bg-elevated: #05050B;
--vz-surface-3:   #111130;
--vz-border-soft: #121228;
--vz-border-glow: #252550;
--vz-text-secondary: #9090B8;
--vz-red:    #FF3B5C;
--vz-indigo: #818CF8;

/* PC identity colors */
--pc1-color: #00CCFF;
--pc2-color: #F59E0B;
--vps-color: #00FF88;

/* Layout dimensions */
--leftnav-width:      60px;
--rightsidebar-width: 220px;
--topbar-height:      28px;
--terminal-default:   260px;
--tabbar-height:      32px;
--infobar-height:     28px;
```

**Commit:** `feat: Phase 2 complete — Warp-like terminal UX`

---

## Phase 3 — 3D Chibi Robot Scene
**Goal:** Right sidebar shows compact R3F scene with chibi robots per active agent.

### Task 3.1 — Create ChibiRobot.tsx
**File:** `src/renderer/components/RightSidebar/ChibiRobot.tsx`

```tsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Session, DetectedAgent } from '@shared/types';
import { AGENT_INFO, AGENT_COLORS } from '@shared/types';
import { NODE_CONFIG } from '@shared/types';

type AgentStatus = Session['status'];

interface ChibiRobotProps {
  agentType: string;
  status: AgentStatus;
  name: string;
  nodeId?: string;   // for DetectedAgent — shows PC badge
  position: [number, number, number];
  isActive?: boolean;
  onClick?: () => void;
}

export const ChibiRobot: React.FC<ChibiRobotProps> = ({
  agentType,
  status,
  name,
  nodeId,
  position,
  isActive = false,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const agentColor = AGENT_COLORS[agentType as keyof typeof AGENT_COLORS] || '#5a5a78';
  const pcNode = nodeId ? NODE_CONFIG.find((n) => n.id === nodeId) : null;

  const matProps = useMemo(() => ({
    color: '#0a0a1e',
    emissive: new THREE.Color(agentColor),
    emissiveIntensity: 0.08,
    metalness: 0.85,
    roughness: 0.15,
  }), [agentColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (status === 'working') {
      // Fast head bob
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 5)) * 0.05;
      // Emissive pulse
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity < 2) {
            mat.emissiveIntensity = 0.3 + Math.sin(t * 6) * 0.2;
          }
        }
      });
    } else if (status === 'idle') {
      // Gentle float
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2) * 0.04;
    } else if (status === 'waiting') {
      // Breathe scale
      const s = 1 + Math.sin(t * 1.5) * 0.018;
      groupRef.current.scale.setScalar(s);
      groupRef.current.position.y = position[1];
    } else {
      // Offline — dim
      groupRef.current.position.y = position[1];
    }
  });

  const isOffline = status === 'offline';
  const opacity = isOffline ? 0.25 : 1;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* === CHIBI BODY: big head = chibi === */}
      {/* Kafa (large, ~40% of height) */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.38, 0.38, 0.35]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Visor / Eyes — agent color glowing */}
      <mesh position={[0, 0.57, 0.18]}>
        <boxGeometry args={[0.24, 0.08, 0.02]} />
        <meshStandardMaterial
          color={agentColor}
          emissive={agentColor}
          emissiveIntensity={isOffline ? 0.1 : 1.8}
          transparent={isOffline}
          opacity={opacity}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.3, 0.32, 0.22]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Core light on chest */}
      <mesh position={[0, 0.18, 0.12]}>
        <circleGeometry args={[0.055, 12]} />
        <meshStandardMaterial
          color={agentColor}
          emissive={agentColor}
          emissiveIntensity={isOffline ? 0.2 : 2.2}
          side={THREE.DoubleSide}
          transparent={isOffline}
          opacity={opacity}
        />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.22, 0.2, 0]}>
        <capsuleGeometry args={[0.055, 0.22, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.22, 0.2, 0]}>
        <capsuleGeometry args={[0.055, 0.22, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.09, -0.15, 0]}>
        <capsuleGeometry args={[0.065, 0.26, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.09, -0.15, 0]}>
        <capsuleGeometry args={[0.065, 0.26, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Status ring (floor shadow) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[0.28, 0.38, 24]} />
        <meshBasicMaterial
          color={agentColor}
          transparent
          opacity={isOffline ? 0.04 : (status === 'working' ? 0.5 : 0.18)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Point light glow */}
      {!isOffline && (
        <pointLight
          color={agentColor}
          intensity={status === 'working' ? 1.4 : status === 'idle' ? 0.4 : 0.15}
          distance={3}
          decay={2}
        />
      )}

      {/* PC Badge + Name label */}
      <Html
        position={[0, 0.98, 0]}
        center
        distanceFactor={7}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}>
          <span style={{
            fontSize: 8,
            fontFamily: 'monospace',
            color: agentColor,
            textShadow: `0 0 6px ${agentColor}`,
            whiteSpace: 'nowrap',
            background: 'rgba(2,2,5,0.75)',
            padding: '1px 4px',
            borderRadius: 3,
          }}>
            {name}
          </span>
          {pcNode && (
            <span style={{
              fontSize: 7,
              fontFamily: 'monospace',
              color: pcNode.color,
              background: `${pcNode.color}18`,
              border: `1px solid ${pcNode.color}30`,
              padding: '0px 3px',
              borderRadius: 2,
              letterSpacing: '0.05em',
            }}>
              {pcNode.name.toUpperCase()}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};
```

### Task 3.2 — Create ScenePlatform.tsx
**File:** `src/renderer/components/RightSidebar/ScenePlatform.tsx`

```tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ScenePlatform: React.FC = () => {
  const platformRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (edgeRef.current) {
      const mat = edgeRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(t * 0.8) * 0.15;
    }
  });

  return (
    <group position={[0, -0.32, 0]}>
      {/* Main platform disc */}
      <mesh ref={platformRef} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.06, 6]} />
        <meshStandardMaterial
          color="#06060f"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glowing edge ring */}
      <mesh ref={edgeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.9, 2.02, 6]} />
        <meshBasicMaterial
          color="#00ccff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Under-glow point light */}
      <pointLight position={[0, -0.3, 0]} color="#0040FF" intensity={0.5} distance={5} decay={2} />

      {/* Central desk for active agent */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.32]} />
        <meshStandardMaterial color="#0d0d22" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Monitor on desk */}
      <mesh position={[0, 0.22, -0.08]}>
        <boxGeometry args={[0.28, 0.18, 0.02]} />
        <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
};
```

### Task 3.3 — Create CompactScene.tsx (R3F canvas)
**File:** `src/renderer/components/RightSidebar/CompactScene.tsx`

```tsx
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSessionStore } from '../../hooks/useSessionStore';
import { ChibiRobot } from './ChibiRobot';
import { ScenePlatform } from './ScenePlatform';
import { ErrorBoundary3D } from '../UI/ErrorBoundary3D';
import type { AgentType } from '@shared/types';

// Positions around platform for up to 8 agents
const AGENT_POSITIONS: [number, number, number][] = [
  [0, 0, 0.9],      // front center (active - at desk area)
  [-0.9, 0, 0],     // left
  [0.9, 0, 0],      // right
  [0, 0, -0.9],     // back
  [-0.65, 0, 0.65], // front-left
  [0.65, 0, 0.65],  // front-right
  [-0.65, 0, -0.65],// back-left
  [0.65, 0, -0.65], // back-right
];

interface AgentEntry {
  id: string;
  agentType: AgentType;
  status: 'idle' | 'working' | 'waiting' | 'offline';
  name: string;
  nodeId?: string;
}

export const CompactScene: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const detectedAgents = useSessionStore((s) => s.detectedAgents);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  // Merge local sessions + remote detected agents
  const allAgents = useMemo<AgentEntry[]>(() => {
    const local: AgentEntry[] = sessions.map((s) => ({
      id: s.id,
      agentType: s.agentType,
      status: s.status,
      name: s.name,
      nodeId: undefined, // local
    }));

    const remote: AgentEntry[] = [];
    detectedAgents.forEach((agents, nodeId) => {
      agents.forEach((a) => {
        // Avoid duplicates with local sessions
        const isDuplicate = local.some((l) => l.agentType === a.agentType);
        if (!isDuplicate) {
          remote.push({
            id: `${nodeId}-${a.pid}`,
            agentType: a.agentType,
            status: 'working',
            name: `${a.agentType} (${nodeId})`,
            nodeId,
          });
        }
      });
    });

    return [...local, ...remote].slice(0, 8);
  }, [sessions, detectedAgents]);

  // Sort: active first (working), then idle, then others
  const sortedAgents = useMemo(() => {
    return [...allAgents].sort((a, b) => {
      if (a.status === 'working' && b.status !== 'working') return -1;
      if (b.status === 'working' && a.status !== 'working') return 1;
      return 0;
    });
  }, [allAgents]);

  if (allAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-vz-muted/20 text-xs font-mono text-center px-4 leading-relaxed">
          Terminal'den bir araç başlatın
        </div>
      </div>
    );
  }

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
      style={{ background: '#020205' }}
    >
      <PerspectiveCamera makeDefault position={[0, 3.5, 5]} fov={48} near={0.1} far={50} />
      <fog attach="fog" args={['#020205', 7, 16]} />

      {/* Lighting */}
      <ambientLight intensity={0.08} color="#1A1A3A" />
      <directionalLight position={[3, 5, 3]} intensity={0.35} color="#8888CC" />

      {/* Platform */}
      <ErrorBoundary3D>
        <ScenePlatform />
      </ErrorBoundary3D>

      {/* Robots */}
      <ErrorBoundary3D>
        {sortedAgents.map((agent, i) => (
          <ChibiRobot
            key={agent.id}
            agentType={agent.agentType}
            status={agent.status}
            name={agent.name}
            nodeId={agent.nodeId}
            position={AGENT_POSITIONS[i] || [0, 0, 0]}
            isActive={agent.id === activeSessionId}
            onClick={() => {
              if (!agent.nodeId) setActiveSession(agent.id);
            }}
          />
        ))}
      </ErrorBoundary3D>

      {/* Post-processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.9} intensity={0.9} />
      </EffectComposer>
    </Canvas>
  );
};
```

### Task 3.4 — Update RightSidebar to use CompactScene
**File:** `src/renderer/components/Layout/RightSidebar.tsx`

Replace with:
```tsx
import React, { Suspense } from 'react';
import { CompactScene } from '../RightSidebar/CompactScene';
import { ErrorBoundary3D } from '../UI/ErrorBoundary3D';

export const RightSidebar: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-vz-bg overflow-hidden">
      {/* 3D Scene */}
      <div className="flex-shrink-0 relative border-b border-vz-border/40" style={{ height: 220 }}>
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #020205, transparent)' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #020205 20%, transparent)' }} />

        <Suspense fallback={<div className="w-full h-full bg-vz-bg" />}>
          <ErrorBoundary3D>
            <CompactScene />
          </ErrorBoundary3D>
        </Suspense>
      </div>

      {/* Task Queue (placeholder for Phase 5) */}
      <div className="flex-1 min-h-0 overflow-y-auto border-b border-vz-border/40">
        <div className="p-2">
          <div className="text-[10px] font-mono text-vz-muted/40 uppercase tracking-wider px-1 mb-2">
            Görev Kuyruğu
          </div>
          <div className="text-vz-muted/20 text-xs font-mono text-center py-6">
            Faz 5'te gelecek
          </div>
        </div>
      </div>

      {/* PC Health (placeholder for Phase 5) */}
      <div className="flex-shrink-0 p-2" style={{ height: 80 }}>
        <div className="text-[10px] font-mono text-vz-muted/40 uppercase tracking-wider px-1 mb-1">
          PC Sağlık
        </div>
        <div className="text-vz-muted/20 text-[10px] font-mono text-center py-2">
          Faz 5'te gelecek
        </div>
      </div>
    </div>
  );
};
```

**Note:** Create `src/renderer/components/RightSidebar/` directory if not exists.

### Task 3.5 — Typecheck and verify
```bash
npm run typecheck
# Expected: 0 errors
```

**Commit:** `feat: Phase 3 complete — 3D chibi robot scene in right sidebar`

---

## Phase 4 — Multi-PC Agent Detection + Spawn Animations
**Goal:** Remote PC agents appear in scene. Robots spawn/despawn with animation.

### Task 4.1 — Wrap ChibiRobot with AnimatePresence
**File:** `src/renderer/components/RightSidebar/CompactScene.tsx`

The robots already re-render when `allAgents` changes. Add spawn effect by using a `key` that changes — R3F handles this via React reconciliation. No extra animation needed for 3D; use Framer Motion for the overlay label.

### Task 4.2 — Ensure ProcessWatcherManager triggers IPC correctly
**File:** `src/renderer/hooks/useIPC.ts`

Verify the `AGENT_DETECTED_UPDATE` handler stores data:
```ts
// Find in useIPC.ts — should already exist
window.electronAPI.on(IPC.AGENT_DETECTED_UPDATE, (...args: unknown[]) => {
  const [nodeId, agents] = args as [NodeId, DetectedAgent[]];
  useSessionStore.getState().setDetectedAgents(nodeId, agents);
});
```
If missing, add it in the `useEffect` IPC listener block.

### Task 4.3 — Test multi-PC: verify VPS agent shows in scene
```bash
# On PC1 terminal in VibeZone:
ssh vps "ps aux | grep claude"
# If running, robot should appear in sidebar with VPS badge (green)
```

**Commit:** `feat: Phase 4 — multi-PC agent detection in 3D scene`

---

## Phase 5 — Task Queue + PC Health Panels
**Goal:** Right sidebar's lower sections show real data.

### Task 5.1 — Create TaskQueuePanel.tsx
**File:** `src/renderer/components/RightSidebar/TaskQueuePanel.tsx`

```tsx
import React, { useMemo } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { AGENT_COLORS } from '@shared/types';
import type { TaskStatus } from '@shared/types';

const STATUS_ICONS: Record<TaskStatus, { icon: string; color: string }> = {
  inbox:       { icon: '○', color: '#555578' },
  in_progress: { icon: '●', color: '#00CCFF' },
  in_review:   { icon: '◐', color: '#F59E0B' },
  done:        { icon: '✓', color: '#00FF88' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF3B5C',
  medium: '#00CCFF',
  low: '#555578',
  none: '#333350',
};

export const TaskQueuePanel: React.FC = () => {
  const tasks = useSessionStore((s) => s.tasks);
  const sessions = useSessionStore((s) => s.sessions);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        // in_progress first
        if (a.status === 'in_progress') return -1;
        if (b.status === 'in_progress') return 1;
        // then by priority
        const p = { high: 0, medium: 1, low: 2, none: 3 };
        return (p[a.priority] ?? 3) - (p[b.priority] ?? 3);
      })
      .slice(0, 20);
  }, [tasks]);

  if (activeTasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-vz-muted/20 text-[10px] font-mono">Görev yok</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {activeTasks.map((task, i) => {
        const assignedSession = task.assigneeSessionId
          ? sessions.find((s) => s.id === task.assigneeSessionId)
          : null;
        const agentColor = assignedSession
          ? AGENT_COLORS[assignedSession.agentType] || '#555578'
          : '#333350';
        const statusConfig = STATUS_ICONS[task.status];
        const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none;

        return (
          <div
            key={task.id}
            className="relative px-3 py-1.5 border-b border-vz-border-soft hover:bg-vz-surface-3 transition-colors duration-100 cursor-pointer"
          >
            {/* Priority bar */}
            <div
              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
              style={{ backgroundColor: priorityColor }}
            />

            {/* Row 1: number + title + status */}
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-[9px] font-mono text-vz-muted/50 w-5 flex-shrink-0">
                #{String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[11px] text-vz-text truncate flex-1 min-w-0">
                {task.title}
              </span>
              <span
                className="flex-shrink-0 text-[11px]"
                style={{ color: statusConfig.color }}
              >
                {statusConfig.icon}
              </span>
            </div>

            {/* Row 2: agent chip */}
            {assignedSession && (
              <div className="flex items-center gap-1 mt-0.5 pl-7">
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono"
                  style={{
                    backgroundColor: `${agentColor}18`,
                    color: agentColor,
                    border: `1px solid ${agentColor}30`,
                  }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: agentColor }}
                  />
                  {assignedSession.name}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### Task 5.2 — Create PCHealthMini.tsx
**File:** `src/renderer/components/RightSidebar/PCHealthMini.tsx`

```tsx
import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { NODE_CONFIG } from '@shared/types';

function cpuColor(pct: number): string {
  if (pct > 80) return '#FF3B5C';
  if (pct > 60) return '#F59E0B';
  return '#00FF88';
}

function ramPercent(status: { ram?: { totalMB: number; usedMB: number } }): number {
  if (!status.ram) return 0;
  return Math.round((status.ram.usedMB / status.ram.totalMB) * 100);
}

export const PCHealthMini: React.FC = () => {
  const nodeStatuses = useSessionStore((s) => s.nodeStatuses);

  return (
    <div className="h-full px-2 py-1.5 space-y-1">
      {NODE_CONFIG.slice(0, 3).map((node) => {
        const status = nodeStatuses.find((n) => n.nodeId === node.id);
        const isOnline = status?.connection === 'online';
        const ram = status ? ramPercent(status) : 0;
        const ramBarColor = cpuColor(ram);

        return (
          <div key={node.id} className="flex items-center gap-1.5 h-5">
            {/* PC name */}
            <span
              className="text-[9px] font-mono font-bold w-7 flex-shrink-0"
              style={{ color: node.color }}
            >
              {node.name.toUpperCase().slice(0, 3)}
            </span>

            {/* Online dot */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isOnline ? '#00FF88' : '#3A3A5C',
                boxShadow: isOnline ? '0 0 4px rgba(0,255,136,0.6)' : 'none',
              }}
            />

            {/* RAM bar */}
            <div className="flex-1 h-1 rounded-full bg-vz-surface overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${ram}%`, backgroundColor: ramBarColor }}
              />
            </div>

            {/* RAM% */}
            <span className="text-[9px] font-mono text-vz-muted/60 w-7 text-right flex-shrink-0">
              {ram}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
```

### Task 5.3 — Update RightSidebar with real panels
**File:** `src/renderer/components/Layout/RightSidebar.tsx`

Add imports and replace placeholders:
```tsx
import { TaskQueuePanel } from '../RightSidebar/TaskQueuePanel';
import { PCHealthMini } from '../RightSidebar/PCHealthMini';
```

Replace task queue placeholder:
```tsx
{/* Task Queue */}
<div className="flex-1 min-h-0 overflow-hidden border-b border-vz-border/40 flex flex-col">
  <div className="px-3 py-1.5 border-b border-vz-border/30 flex-shrink-0 flex items-center justify-between">
    <span className="text-[9px] font-mono text-vz-muted uppercase tracking-widest">
      Görev Kuyruğu
    </span>
  </div>
  <div className="flex-1 min-h-0">
    <TaskQueuePanel />
  </div>
</div>
```

Replace PC health placeholder:
```tsx
{/* PC Health */}
<div className="flex-shrink-0 border-t border-vz-border/40" style={{ height: 80 }}>
  <div className="px-3 py-1 border-b border-vz-border/30">
    <span className="text-[9px] font-mono text-vz-muted uppercase tracking-widest">PC Sağlık</span>
  </div>
  <PCHealthMini />
</div>
```

### Task 5.4 — Add PCHealthCard to DashboardView
**File:** `src/renderer/components/Dashboard/PCHealthCard.tsx`

```tsx
import React from 'react';
import { NODE_CONFIG } from '@shared/types';
import type { NodeStatus } from '@shared/types';

interface Props {
  nodeId: string;
  status?: NodeStatus;
}

function metricColor(pct: number): string {
  if (pct > 80) return '#FF3B5C';
  if (pct > 60) return '#F59E0B';
  return '#00FF88';
}

const MetricBar: React.FC<{ label: string; value: number; color: string; detail: string }> = ({
  label, value, color, detail
}) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-mono text-vz-muted w-8 flex-shrink-0">{label}</span>
    <div className="flex-1 h-1 rounded-full bg-vz-surface overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
    <span className="text-[10px] font-mono text-vz-muted w-10 text-right flex-shrink-0">{detail}</span>
  </div>
);

export const PCHealthCard: React.FC<Props> = ({ nodeId, status }) => {
  const node = NODE_CONFIG.find((n) => n.id === nodeId);
  if (!node) return null;

  const isOnline = status?.connection === 'online';
  const ramPct = status?.ram
    ? Math.round((status.ram.usedMB / status.ram.totalMB) * 100)
    : 0;
  const diskPct = status?.disk?.usedPercent ?? 0;

  return (
    <div
      className="p-4 rounded-xl flex flex-col gap-3 h-full"
      style={{
        background: 'rgba(6,6,18,0.85)',
        border: `1px solid ${node.color}20`,
        borderTop: `1px solid ${node.color}35`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${node.color}18`, border: `1px solid ${node.color}30` }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={node.color} strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-semibold" style={{ color: node.color }}>
              {node.name}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase"
              style={{
                backgroundColor: isOnline ? 'rgba(0,255,136,0.12)' : 'rgba(58,58,92,0.3)',
                color: isOnline ? '#00FF88' : '#3A3A5C',
                border: isOnline ? '1px solid rgba(0,255,136,0.25)' : '1px solid rgba(58,58,92,0.5)',
              }}
            >
              {isOnline ? 'online' : status?.connection === 'connecting' ? 'bağlanıyor' : 'offline'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-vz-muted">{node.ip}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <MetricBar label="RAM" value={ramPct} color={metricColor(ramPct)}
          detail={status?.ram ? `${status.ram.usedMB}/${status.ram.totalMB}M` : '--'} />
        <MetricBar label="Disk" value={diskPct} color={metricColor(diskPct)}
          detail={`${diskPct}%`} />
      </div>

      {/* Uptime */}
      {status?.uptime && (
        <div className="text-[10px] font-mono text-vz-muted/60">
          Çalışma süresi: {status.uptime}
        </div>
      )}

      {/* Services */}
      {status?.services && status.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {status.services.slice(0, 4).map((svc) => (
            <span
              key={svc.name}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: svc.status === 'running' ? 'rgba(0,255,136,0.1)' : 'rgba(255,59,92,0.1)',
                color: svc.status === 'running' ? '#00FF88' : '#FF3B5C',
              }}
            >
              {svc.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
```

Add `PCHealthCard` to `DashboardView.tsx` — add a new widget section at top:
```tsx
// In DashboardView.tsx, import:
import { PCHealthCard } from './PCHealthCard';
// Add above the widget canvas:
<div className="px-4 py-3 grid grid-cols-3 gap-3 flex-shrink-0 border-b border-vz-border/50" style={{ height: 180 }}>
  {NODE_CONFIG.slice(0, 3).map((node) => (
    <PCHealthCard
      key={node.id}
      nodeId={node.id}
      status={nodeStatuses.find((s) => s.nodeId === node.id)}
    />
  ))}
</div>
```

**Commit:** `feat: Phase 5 — task queue, PC health mini + cards`

---

## Phase 6 — Stabilization + Polish
**Goal:** Zero TypeScript errors, clean build, daily-driver ready.

### Task 6.1 — Typecheck all
```bash
npm run typecheck
# Fix any remaining type errors
```

### Task 6.2 — Update OnboardingTooltip messages
Remove tooltips referencing old "Sahne" tab. Update:
- Terminal tooltip → "Terminal burada, Ctrl+T ile yeni sekme"
- Right sidebar toggle → "Ctrl+B ile aç/kapat"

### Task 6.3 — Update useHotkeys
**File:** `src/renderer/hooks/useHotkeys.ts`

Ensure:
- `Ctrl+1` → `setActiveView('terminal')`
- `Ctrl+2` → `setActiveView('tasks')`
- `Ctrl+3` → `setActiveView('dashboard')`
- `Ctrl+4` → `setActiveView('nodes')`
- `Ctrl+B` → `setRightSidebarOpen(!rightSidebarOpen)`

### Task 6.4 — Remove Sidebar.tsx (replaced by LeftNav)
Old `Sidebar.tsx` is no longer used. Remove import from App.tsx (already done in Task 1.3). Keep file but mark as deprecated or delete.

### Task 6.5 — Final build test
```bash
npm run build
# Expected: successful, 0 errors

npm run dev
# Expected: app opens, 3-column layout, robots visible, terminal works
```

**Commit:** `feat: VibeZone v3 complete — terminal-first, chibi robots, multi-PC`

---

## Summary

| Phase | Files Changed | Complexity |
|-------|---------------|------------|
| 1 — Layout + Cleanup | App.tsx, useSessionStore, LeftNav.tsx, RightSidebar.tsx (shell) | L |
| 2 — Terminal UX | TerminalPanel.tsx, TerminalTabBar.tsx, TerminalInfoBar.tsx, index.css | L |
| 3 — 3D Scene | ChibiRobot.tsx, ScenePlatform.tsx, CompactScene.tsx, RightSidebar.tsx | XL |
| 4 — Multi-PC | useIPC.ts (verify), CompactScene.tsx (dedupe) | M |
| 5 — Queue + Health | TaskQueuePanel.tsx, PCHealthMini.tsx, PCHealthCard.tsx, DashboardView.tsx | M |
| 6 — Stabilize | useHotkeys.ts, typecheck, build | S |

**Total new/modified files:** ~20 files
**Deleted files:** 17 isometric files from CyberScene/
