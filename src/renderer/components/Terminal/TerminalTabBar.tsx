import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { AGENT_COLORS } from '@shared/types';

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
            className="group flex items-center gap-1.5 px-3 h-full text-[11px] font-mono whitespace-nowrap flex-shrink-0 transition-all duration-150 relative"
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
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: statusColor,
                boxShadow: isActive ? `0 0 5px ${statusColor}` : 'none',
              }}
            />
            <span className={isActive ? '' : 'group-hover:text-vz-text transition-colors'}>
              {session.name}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); killSession(session.id); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), killSession(session.id))}
              className="ml-0.5 w-3 h-3 rounded flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/30 text-vz-muted hover:text-red-400 transition-all"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={quickCreateShell}
        title="Yeni Terminal (Ctrl+T)"
        className="flex-shrink-0 w-8 h-full flex items-center justify-center text-vz-muted hover:text-vz-green hover:bg-vz-green/10 transition-all"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
