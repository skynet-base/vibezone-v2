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
            <span className="text-sm font-semibold" style={{ color: node.color }}>
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

      <div className="space-y-2">
        <MetricBar label="RAM" value={ramPct} color={metricColor(ramPct)}
          detail={status?.ram ? `${status.ram.usedMB}/${status.ram.totalMB}M` : '--'} />
        <MetricBar label="Disk" value={diskPct} color={metricColor(diskPct)}
          detail={`${diskPct}%`} />
      </div>

      {status?.uptime && (
        <div className="text-[10px] font-mono text-vz-muted/60">
          Çalışma: {status.uptime}
        </div>
      )}

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
