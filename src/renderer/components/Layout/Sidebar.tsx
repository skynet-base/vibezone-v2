import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import type { SessionStatus } from '@shared/types';
import { AGENT_INFO, AGENT_COLORS } from '@shared/types';


const STATUS_COLORS: Record<SessionStatus, string> = {
  idle: '#00ff88',
  working: '#00ccff',
  waiting: '#f59e0b',
  offline: '#6b7280',
};

function truncateCwd(cwd: string, maxLen = 28): string {
  if (cwd.length <= maxLen) return cwd;
  const parts = cwd.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return '...' + cwd.slice(-maxLen + 3);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
}

export const Sidebar: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const tasks = useSessionStore((s) => s.tasks);
  const setCreateAgentModalOpen = useSessionStore((s) => s.setCreateAgentModalOpen);
  const toggleTerminal = useSessionStore((s) => s.toggleTerminal);
  const terminalOpen = useSessionStore((s) => s.terminalOpen);
  const sidebarWidth = useSessionStore((s) => s.sidebarWidth);
  const setSidebarWidth = useSessionStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useSessionStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSessionStore((s) => s.toggleSidebar);
  const { killSession, importTeam, quickCreateShell } = useIPC();
  const showConfirm = useSessionStore((s) => s.showConfirm);

  const [sshExpanded, setSshExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.min(400, Math.max(180, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [setSidebarWidth]);

  const terminalSessions = useMemo(
    () => sessions.filter(s => !s.category || s.category === 'terminal'),
    [sessions]
  );
  const teamSessions = useMemo(
    () => sessions.filter(s => s.category === 'team'),
    [sessions]
  );

  const taskCountBySession = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.assigneeSessionId && t.status !== 'done') {
        counts[t.assigneeSessionId] = (counts[t.assigneeSessionId] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    // Only open terminal for terminal agents
    if (session && (!session.category || session.category === 'terminal')) {
      if (!terminalOpen) {
        toggleTerminal();
      }
    }
  }, [sessions, setActiveSession, terminalOpen, toggleTerminal]);

  const renderSessionItem = (session: typeof sessions[0], index: number) => {
    const info = AGENT_INFO[session.agentType];
    const agentColor = info?.color || '#5a5a78';
    const taskCount = taskCountBySession[session.id] || 0;
    const isActive = activeSessionId === session.id;

    return (
      <motion.div
        key={session.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.03 }}
      >
        <button
          onClick={() => handleSelectSession(session.id)}
          onContextMenu={async (e) => {
            e.preventDefault();
            const ok = await showConfirm({
              title: 'Oturumu Sonlandir',
              message: `"${session.name}" adli oturum kapatilacak. Devam etmek istiyor musunuz?`,
              confirmText: 'Sonlandir',
              variant: 'danger',
            });
            if (ok) killSession(session.id);
          }}
          className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 transition-all duration-150 group relative overflow-hidden ${isActive
              ? 'glass-1'
              : 'hover:bg-vz-border/20 border border-transparent'
            }`}
          style={isActive ? { borderColor: agentColor + '30' } : undefined}
        >
          {/* Active session left accent bar */}
          {isActive && (
            <div
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
              style={{ backgroundColor: agentColor }}
            />
          )}

          {/* Hover left border */}
          <div
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full opacity-0 group-hover:opacity-40 transition-opacity"
            style={{ backgroundColor: agentColor }}
          />

          <div className="flex items-center gap-2">
            {/* Agent color dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: agentColor }}
            />

            {/* Name */}
            <span className="text-xs font-medium text-vz-text truncate flex-1">
              {session.name}
            </span>

            {/* Task count badge */}
            {taskCount > 0 && (
              <span className="text-[9px] bg-vz-amber/20 text-vz-amber px-1.5 py-0.5 rounded-full font-bold">
                {taskCount}
              </span>
            )}

            {/* Status dot */}
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === 'working' || session.status === 'waiting'
                  ? 'pulse-dot'
                  : ''
                }`}
              style={{ backgroundColor: STATUS_COLORS[session.status] }}
              title={session.status}
            />
          </div>

          {/* CWD */}
          <div className="text-[10px] text-vz-muted mt-0.5 font-mono truncate pl-4">
            {truncateCwd(session.cwd)}
          </div>
        </button>
      </motion.div>
    );
  };

  // Collapsed mode: show only icons
  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col glass-card border-none items-center" style={{ width: 60 }}>
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-3 text-vz-muted hover:text-vz-cyan transition-colors border-b border-vz-border/50"
          title="Sidebar'i genislet"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Add agent */}
        <button
          onClick={() => setCreateAgentModalOpen(true)}
          className="mt-3 w-9 h-9 rounded-lg flex items-center justify-center text-vz-cyan hover:bg-vz-cyan/10 transition-colors"
          style={{ border: '1px solid rgba(0,240,255,0.3)' }}
          title="Agent Ekle"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {/* Terminal */}
        <button
          onClick={quickCreateShell}
          className="mt-2 w-9 h-9 rounded-lg flex items-center justify-center text-vz-green/80 hover:bg-vz-green/10 transition-colors"
          style={{ border: '1px solid rgba(0,255,136,0.2)' }}
          title="Terminal Ac"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </button>

        {/* Session dots */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 flex flex-col items-center">
          {sessions.map((session) => {
            const info = AGENT_INFO[session.agentType];
            const agentColor = info?.color || '#5a5a78';
            const isActive = activeSessionId === session.id;
            return (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'ring-1 ring-offset-1 ring-offset-vz-bg' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${agentColor}20`,
                  borderColor: isActive ? agentColor : 'transparent',
                  borderWidth: 1,
                  boxShadow: isActive ? `0 0 0 2px ${agentColor}40` : undefined,
                }}
                title={session.name}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: agentColor }}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col glass-card border-none mr-4" style={{ width: sidebarWidth }}>
      {/* Resize handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:border-l hover:border-vz-cyan/30 transition-colors ${isResizing ? 'bg-vz-cyan/50' : ''}`}
        style={{ zIndex: 20 }}
        onMouseDown={handleResizeStart}
      />
      {/* Logo area + collapse toggle */}
      <div className="px-4 py-3 border-b border-vz-border/50 relative z-10 flex items-start justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold tracking-widest text-vz-cyan"
            style={{
              textShadow: '0 0 20px rgba(0,240,255,0.6), 0 0 40px rgba(0,240,255,0.3)',
              animation: 'float-gentle 4s ease-in-out infinite',
            }}
          >
            VIBEZONE
          </h1>
          <p className="text-[10px] text-vz-muted mt-0.5 tracking-[0.2em] font-mono">
            COMMAND CENTER
          </p>
        </div>
        <button
          onClick={toggleSidebar}
          className="mt-1 p-1 rounded hover:bg-vz-surface/60 text-vz-muted hover:text-vz-cyan transition-colors"
          title="Sidebar'i daralt"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* New Agent button */}
      <div className="px-4 py-4 space-y-2 relative z-10">
        <button
          onClick={() => setCreateAgentModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-vz-cyan rounded-xl transition-all duration-300 hover:brightness-110 active:scale-[0.98] group"
          style={{
            background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(178,0,255,0.05))',
            border: '1px solid rgba(0,240,255,0.3)',
            boxShadow: '0 0 15px rgba(0,240,255,0.15), inset 0 0 10px rgba(0,240,255,0.05)'
          }}
        >
          {/* Hexagon icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Agent Ekle
        </button>
        <button
          onClick={quickCreateShell}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-vz-green/80 rounded-xl transition-all duration-300 hover:bg-vz-green/10 hover:text-vz-green border border-vz-border/50 hover:border-vz-green/40 hover:shadow-neon-green"
          title="Hizli Terminal Ac (Ctrl+Shift+T)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Terminal Ac
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 relative z-10">
        {/* Terminal Agents */}
        {terminalSessions.length > 0 && (
          <>
            <div className="text-[10px] text-vz-muted uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span>Terminal ({terminalSessions.length})</span>
              <hr className="flex-1 border-vz-border" />
            </div>
            <AnimatePresence>
              {terminalSessions.map((session, i) => renderSessionItem(session, i))}
            </AnimatePresence>
          </>
        )}

        {/* Team Agents */}
        {teamSessions.length > 0 && (
          <>
            <div className="text-[10px] text-vz-muted uppercase tracking-wider px-2 mb-1.5 mt-3 flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Takim ({teamSessions.length})</span>
              <hr className="flex-1 border-vz-border" />
            </div>
            <AnimatePresence>
              {teamSessions.map((session, i) => renderSessionItem(session, i))}
            </AnimatePresence>
          </>
        )}

        {sessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 px-4"
          >
            {/* Cyberpunk geometric pattern */}
            <div className="mb-4 flex items-center justify-center">
              <div className="relative w-16 h-16">
                <div
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(0,204,255,0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,204,255,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '8px 8px',
                  }}
                />
                <div
                  className="absolute inset-2 border border-vz-cyan/30 rounded"
                  style={{ transform: 'rotate(45deg)' }}
                />
                <div
                  className="absolute inset-4 border border-vz-purple/30 rounded"
                  style={{ transform: 'rotate(22.5deg)' }}
                />
              </div>
            </div>
            <p className="text-xs text-vz-muted mb-1">
              Hosgeldiniz!
            </p>
            <p className="text-[10px] text-vz-muted/50 mb-4 leading-relaxed">
              Terminal acarak komut satirindan calisin, veya bir AI asistan baslatin.
            </p>
            <div className="space-y-2">
              <button
                onClick={quickCreateShell}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'rgba(0,255,136,0.08)',
                  border: '1px solid rgba(0,255,136,0.3)',
                  color: '#00ff88',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                Terminal Ac
              </button>
              <button
                onClick={() => setCreateAgentModalOpen(true)}
                className="btn-primary text-xs px-4 py-2 w-full"
              >
                + AI Asistan Baslat
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Team Import button */}
      <div className="border-t border-vz-border px-3 py-2.5">
        <button
          onClick={importTeam}
          className="w-full py-2.5 text-xs text-vz-muted hover:text-vz-purple border border-vz-border hover:border-vz-purple/30 transition-all flex items-center justify-center gap-2 rounded-lg hover:glass-1"
          title="Mevcut bir ai-agent-team-setup projesini iceri aktarin"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Takim Projesi Ice Aktar</span>
        </button>
        <p className="text-[9px] text-vz-muted/40 text-center mt-1.5 leading-relaxed">
          Mevcut bir proje klasorunu yukleyin
        </p>
      </div>
    </div>
  );
};
