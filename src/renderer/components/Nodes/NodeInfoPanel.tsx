import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NODE_CONFIG } from '@shared/types';
import type { NodeId, NodeStatus } from '@shared/types';

interface NodeInfoPanelProps {
  nodeId: NodeId | null;
  status: NodeStatus | undefined;
  onClose: () => void;
}

function formatRAM(ram?: { totalMB: number; usedMB: number }): string {
  if (!ram) return '-';
  return `${(ram.usedMB / 1024).toFixed(1)} / ${(ram.totalMB / 1024).toFixed(1)} GB`;
}

function ramPercent(ram?: { totalMB: number; usedMB: number }): number {
  if (!ram || ram.totalMB === 0) return 0;
  return Math.round((ram.usedMB / ram.totalMB) * 100);
}

const StatBar: React.FC<{ label: string; value: number; detail: string; color: string }> = ({
  label, value, detail, color,
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-vz-text-secondary">{label}</span>
      <span className="text-vz-text font-mono text-[11px]">{detail}</span>
    </div>
    <div className="h-2 rounded-full bg-vz-surface/80 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  </div>
);

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-3">
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {icon}
    </div>
    <h4 className="text-xs font-display font-semibold text-vz-text-secondary uppercase tracking-wider">
      {title}
    </h4>
  </div>
);

export const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ nodeId, status, onClose }) => {
  const config = nodeId ? NODE_CONFIG.find((n) => n.id === nodeId) : null;
  const conn = status?.connection || 'offline';
  const online = conn === 'online';
  const rp = ramPercent(status?.ram);

  return (
    <AnimatePresence>
      {nodeId && config && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(5,5,8,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[380px] z-50 overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(15,15,30,0.97) 0%, rgba(8,8,18,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderLeft: `1px solid ${config.color}30`,
              boxShadow: `-8px 0 32px rgba(0,0,0,0.5), 0 0 60px ${config.color}10`,
            }}
          >
            {/* Header */}
            <div
              className="p-5 pb-4 sticky top-0 z-10"
              style={{
                background: `linear-gradient(180deg, ${config.color}08 0%, transparent 100%)`,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg"
                    style={{
                      background: `${config.color}20`,
                      border: `1px solid ${config.color}40`,
                      color: config.color,
                      boxShadow: `0 0 20px ${config.color}15`,
                    }}
                  >
                    {config.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-vz-text">{config.name}</h3>
                    <p className="text-[11px] text-vz-text-secondary">{config.role}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-vz-surface/60 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: online ? '#00ff88' : conn === 'connecting' ? '#f59e0b' : '#ff4444',
                    boxShadow: `0 0 8px ${online ? '#00ff8880' : conn === 'connecting' ? '#f59e0b80' : '#ff444480'}`,
                  }}
                />
                <span className="text-xs text-vz-text uppercase font-display font-semibold">
                  {conn}
                </span>
                <span className="text-[10px] text-vz-muted ml-auto font-mono">
                  {config.os}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Connection Info */}
              <div className="glass-2 p-4 space-y-2.5">
                <SectionHeader
                  title="Baglanti"
                  icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                />
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-vz-muted block">Hostname</span>
                    <span className="text-vz-text font-mono">{config.hostname}</span>
                  </div>
                  <div>
                    <span className="text-vz-muted block">IP</span>
                    <span className="text-vz-text font-mono">{config.ip}</span>
                  </div>
                  {config.tailscaleIp && (
                    <div>
                      <span className="text-vz-muted block">Tailscale IP</span>
                      <span className="text-vz-text font-mono">{config.tailscaleIp}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-vz-muted block">Kullanici</span>
                    <span className="text-vz-text font-mono">{config.user}</span>
                  </div>
                  <div>
                    <span className="text-vz-muted block">SSH</span>
                    <span className="text-vz-text font-mono">{config.sshAlias || 'yerel'}</span>
                  </div>
                  <div>
                    <span className="text-vz-muted block">Monitor</span>
                    <span className="text-vz-text font-mono">{config.monitorType}</span>
                  </div>
                </div>
              </div>

              {/* System Stats */}
              {online && status && (
                <div className="glass-2 p-4 space-y-3">
                  <SectionHeader
                    title="Sistem"
                    icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>}
                  />
                  {status.ram && (
                    <StatBar
                      label="RAM"
                      value={rp}
                      detail={`${formatRAM(status.ram)} (${rp}%)`}
                      color={rp > 85 ? '#ff4444' : rp > 60 ? '#f59e0b' : '#00ff88'}
                    />
                  )}
                  {status.disk && (
                    <StatBar
                      label="Disk"
                      value={status.disk.usedPercent}
                      detail={`${status.disk.usedPercent}% kullanildi`}
                      color={status.disk.usedPercent > 80 ? '#ff4444' : '#00ccff'}
                    />
                  )}
                  {status.uptime && (
                    <div className="flex justify-between text-[11px] pt-1">
                      <span className="text-vz-text-secondary">Uptime</span>
                      <span className="text-vz-text font-mono">{status.uptime}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Services */}
              {status?.services && status.services.length > 0 && (
                <div className="glass-2 p-4">
                  <SectionHeader
                    title={`Servisler (${status.services.length})`}
                    icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
                  />
                  <div className="space-y-2">
                    {status.services.map((svc) => (
                      <div
                        key={svc.name}
                        className="flex items-center gap-2.5 p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: svc.status === 'running' ? '#00ff88' : svc.status === 'error' ? '#ff4444' : '#6b7280',
                            boxShadow: `0 0 6px ${svc.status === 'running' ? '#00ff8860' : 'transparent'}`,
                          }}
                        />
                        <span className="text-[11px] text-vz-text flex-1">{svc.name}</span>
                        {svc.pid && (
                          <span className="text-[9px] text-vz-muted font-mono">PID {svc.pid}</span>
                        )}
                        {svc.memPercent && (
                          <span className="text-[9px] text-vz-muted font-mono">{svc.memPercent}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GG Agent Status */}
              {status?.gg_agent_status && (
                <div className="glass-2 p-4">
                  <SectionHeader
                    title="Good Guys Agent"
                    icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
                  />
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-vz-muted">Platform</span>
                      <span className="text-vz-text font-mono">
                        {status.gg_agent_status.platform === 'codex' ? 'OpenClaw Codex' : 'Claude Code'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-vz-muted">PC ID</span>
                      <span className="text-vz-text font-mono">{status.gg_agent_status.pc_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-vz-muted">Aktif Gorevler</span>
                      <span className="text-vz-text font-mono">{status.gg_agent_status.active_tasks}</span>
                    </div>
                    {status.gg_agent_status.model_tier && (
                      <div className="flex justify-between">
                        <span className="text-vz-muted">Model Tier</span>
                        <span className="text-vz-text font-mono">{status.gg_agent_status.model_tier}</span>
                      </div>
                    )}
                    {status.gg_agent_status.autonomous_cron && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)' }}>
                        <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #00ff8860' }} />
                        <span className="text-green-300 text-[10px]">Otonom Cron Aktif</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cron Jobs */}
              {status?.cronJobs && status.cronJobs.length > 0 && (
                <div className="glass-2 p-4">
                  <SectionHeader
                    title={`Cron Isler (${status.cronJobs.length})`}
                    icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                  />
                  <div className="space-y-2">
                    {status.cronJobs.map((job) => (
                      <div
                        key={job.name}
                        className="flex items-center gap-2.5 p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: job.lastStatus === 'ok' ? '#00ff88' : job.lastStatus === 'error' ? '#ff4444' : '#f59e0b',
                          }}
                        />
                        <span className="text-[11px] text-vz-text flex-1 truncate">{job.name}</span>
                        {!job.enabled && (
                          <span className="text-[9px] text-vz-muted px-1.5 py-0.5 rounded bg-vz-surface/60">devre disi</span>
                        )}
                        {job.errors > 0 && (
                          <span className="text-[9px] text-red-400 font-mono">{job.errors} hata</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {status?.error && (
                <div
                  className="p-3 rounded-lg text-[11px] text-red-300"
                  style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)' }}
                >
                  {status.error}
                </div>
              )}

              {/* Offline message */}
              {!online && (
                <div className="text-center py-8">
                  <div className="text-vz-muted text-sm mb-1">Cihaz cevrimdisi</div>
                  <div className="text-vz-muted/50 text-xs">
                    {config.sshAlias ? `ssh ${config.sshAlias} ile baglanti kurulamiyor` : 'Yerel cihaz'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
