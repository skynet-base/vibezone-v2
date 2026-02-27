import React from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { NODE_CONFIG } from '@shared/types';

function metricColor(pct: number): string {
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
    <div className="px-2 py-1.5 space-y-1">
      {NODE_CONFIG.slice(0, 3).map((node) => {
        const status = nodeStatuses.find((n) => n.nodeId === node.id);
        const isOnline = status?.connection === 'online';
        const ram = status ? ramPercent(status) : 0;
        const ramBarColor = metricColor(ram);

        return (
          <div key={node.id} className="flex items-center gap-1.5 h-5">
            <span
              className="text-[9px] font-mono font-bold w-7 flex-shrink-0"
              style={{ color: node.color }}
            >
              {node.name.toUpperCase().slice(0, 3)}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isOnline ? '#00FF88' : '#3A3A5C',
                boxShadow: isOnline ? '0 0 4px rgba(0,255,136,0.6)' : 'none',
              }}
            />
            <div className="flex-1 h-1 rounded-full bg-vz-surface overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${ram}%`, backgroundColor: ramBarColor }}
              />
            </div>
            <span className="text-[9px] font-mono text-vz-muted/60 w-7 text-right flex-shrink-0">
              {ram}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
