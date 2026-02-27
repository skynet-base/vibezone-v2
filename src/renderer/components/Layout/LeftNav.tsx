import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { ActiveView } from '../../hooks/useSessionStore';
import { AGENT_COLORS } from '@shared/types';

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
