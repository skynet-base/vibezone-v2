import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { AGENT_COLORS, NODE_CONFIG } from '@shared/types';

const STATUS_COLORS: Record<string, string> = {
  idle: '#00ff88', working: '#00ccff', waiting: '#f59e0b', offline: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'BOSTA', working: 'ÇALIŞIYOR', waiting: 'BEKLİYOR', offline: 'KAPALI',
};

function truncateCwd(cwd: string, max = 40): string {
  if (!cwd) return '';
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
    : NODE_CONFIG.find((n) => n.sshAlias === null || n.sshAlias === undefined);

  return (
    <div
      className="flex items-center h-7 px-3 gap-3 flex-shrink-0 border-b border-vz-border/30"
      style={{ backgroundColor: 'rgba(13,13,34,0.6)' }}
    >
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

      <span
        className="text-[11px] font-mono font-medium flex-shrink-0"
        style={{ color: agentColor }}
      >
        {session.name}
      </span>

      <span className="w-px h-3 bg-vz-border/60 flex-shrink-0" />

      <span className="text-[11px] font-mono text-vz-muted/70 hover:text-vz-muted transition-colors truncate flex-1 min-w-0">
        {truncateCwd(session.cwd)}
      </span>

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
