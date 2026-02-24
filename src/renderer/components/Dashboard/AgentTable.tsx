import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { SessionStatus } from '@shared/types';
import { AGENT_INFO } from '@shared/types';

const STATUS_ORDER: Record<SessionStatus, number> = {
  working: 0,
  idle: 1,
  waiting: 2,
  offline: 3,
};

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string }> = {
  working: { label: 'Calisiyor', color: '#00ccff' },
  idle: { label: 'Bosta', color: '#00ff88' },
  waiting: { label: 'Bekliyor', color: '#f59e0b' },
  offline: { label: 'Cevrimdisi', color: '#6b7280' },
};

function formatUptime(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}sa ${minutes}dk`;
  }
  return `${minutes}dk`;
}

export const AgentTable: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const tasks = useSessionStore((s) => s.tasks);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const toggleTerminal = useSessionStore((s) => s.toggleTerminal);
  const terminalOpen = useSessionStore((s) => s.terminalOpen);

  // Sort sessions: working first, then idle, waiting, offline
  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    );
  }, [sessions]);

  // Count tasks per session
  const taskCountBySession = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (task.assigneeSessionId) {
        counts[task.assigneeSessionId] = (counts[task.assigneeSessionId] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  const handleRowClick = (sessionId: string, category: string | undefined) => {
    setActiveSession(sessionId);
    if (category === 'terminal' || !category) {
      if (!terminalOpen) {
        toggleTerminal();
      }
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="glass-2 p-6">
        <h3 className="text-sm font-display font-semibold text-vz-text uppercase tracking-wider mb-4 flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          Agent Tablosu
        </h3>
        <p className="text-xs text-vz-muted/60 text-center py-8">
          Henuz aktif agent yok. Yeni agent olusturmak icin sidebar'daki "New Agent" butonunu kullanin.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-2 p-5 overflow-hidden">
      <h3 className="text-sm font-display font-semibold text-vz-text uppercase tracking-wider mb-4 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        Agent Tablosu
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-vz-text-secondary uppercase text-[10px] tracking-wider">
              <th className="text-left pb-3 pr-4 font-medium border-b border-vz-border-glow/30">Agent</th>
              <th className="text-left pb-3 pr-4 font-medium border-b border-vz-border-glow/30">Kategori</th>
              <th className="text-left pb-3 pr-4 font-medium border-b border-vz-border-glow/30">Gorevler</th>
              <th className="text-left pb-3 pr-4 font-medium border-b border-vz-border-glow/30">Durum</th>
              <th className="text-right pb-3 font-medium border-b border-vz-border-glow/30">Uptime</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedSessions.map((session, index) => {
                const info = AGENT_INFO[session.agentType];
                const statusConfig = STATUS_CONFIG[session.status];
                const taskCount = taskCountBySession[session.id] || 0;
                const category = session.category || info?.category || 'terminal';
                const agentColor = info?.color || '#8b5cf6';

                return (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleRowClick(session.id, category)}
                    className="border-b border-vz-border/30 cursor-pointer transition-all group"
                    style={{
                      borderLeftWidth: '0px',
                      borderLeftColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderLeftWidth = '2px';
                      el.style.borderLeftColor = agentColor;
                      el.style.backgroundColor = 'rgba(15,15,26,0.4)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderLeftWidth = '0px';
                      el.style.borderLeftColor = 'transparent';
                      el.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Agent name */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: agentColor,
                            boxShadow: `0 0 6px ${agentColor}60`,
                          }}
                        />
                        <span
                          className="font-medium"
                          style={{ color: agentColor }}
                        >
                          {session.name}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase glass-1 ${
                          category === 'terminal'
                            ? 'text-vz-purple border border-vz-purple/20'
                            : 'text-vz-amber border border-vz-amber/20'
                        }`}
                      >
                        {category === 'terminal' ? 'Terminal' : 'Takim'}
                      </span>
                    </td>

                    {/* Task count */}
                    <td className="py-2.5 pr-4">
                      <span className="text-vz-text font-mono">
                        {taskCount}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            session.status === 'working' || session.status === 'waiting'
                              ? 'pulse-dot'
                              : ''
                          }`}
                          style={{
                            backgroundColor: statusConfig.color,
                            boxShadow: `0 0 6px ${statusConfig.color}60`,
                          }}
                        />
                        <span className="text-vz-text">
                          {statusConfig.label}
                        </span>
                      </div>
                    </td>

                    {/* Uptime */}
                    <td className="py-2.5 text-right">
                      <span className="text-vz-muted font-mono text-[11px]">
                        {formatUptime(session.createdAt)}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};
