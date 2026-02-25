import React, { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { staggerContainer, fadeUp } from '../../lib/animations';
import { NODE_CONFIG } from '@shared/types';
import type { NodeId, NodeStatus, NodeCommandResult } from '@shared/types';
import { NodeInfoPanel } from './NodeInfoPanel';

// Lazy load 3D scene to avoid blocking initial render
const Node3DScene = lazy(() => import('./Node3DScene').then(m => ({ default: m.Node3DScene })));

type ViewMode = '3d' | 'grid';

const api = () => window.electronAPI;

const CONNECTION_COLORS: Record<string, string> = {
  online: '#00ff88',
  offline: '#ff4444',
  connecting: '#f59e0b',
};

function formatRAM(ram?: { totalMB: number; usedMB: number }): string {
  if (!ram) return '-';
  const usedGB = (ram.usedMB / 1024).toFixed(1);
  const totalGB = (ram.totalMB / 1024).toFixed(1);
  return `${usedGB} / ${totalGB} GB`;
}

function ramPercent(ram?: { totalMB: number; usedMB: number }): number {
  if (!ram || ram.totalMB === 0) return 0;
  return Math.round((ram.usedMB / ram.totalMB) * 100);
}

function formatTimestamp(ts: number): string {
  if (!ts) return 'hic';
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}sn once`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}dk once`;
  return `${Math.floor(diffMin / 60)}sa once`;
}

// Progress bar component
const ProgressBar: React.FC<{ value: number; color: string; label: string; detail: string }> = ({
  value, color, label, detail,
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px]">
      <span className="text-vz-text-secondary">{label}</span>
      <span className="text-vz-text font-mono">{detail}</span>
    </div>
    <div className="h-1.5 rounded-full bg-vz-surface/80 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  </div>
);

// Single Node Card
const NodeCard: React.FC<{
  nodeId: NodeId;
  status: NodeStatus | undefined;
  onRefresh: (id: NodeId) => void;
  onExec: (id: NodeId, cmd: string) => void;
  onSelect: (id: NodeId) => void;
  refreshing: boolean;
}> = ({ nodeId, status, onRefresh, onExec, onSelect, refreshing }) => {
  const config = NODE_CONFIG.find((n) => n.id === nodeId)!;
  const conn = status?.connection || 'offline';
  const connColor = CONNECTION_COLORS[conn];
  const rp = ramPercent(status?.ram);
  const ramColor = rp > 85 ? '#ff4444' : rp > 60 ? '#f59e0b' : '#00ff88';

  const [cmd, setCmd] = useState('');
  const [cmdResult, setCmdResult] = useState<NodeCommandResult | null>(null);
  const [executing, setExecuting] = useState(false);

  const handleExec = async () => {
    if (!cmd.trim()) return;
    setExecuting(true);
    try {
      const result = await api().node.exec(nodeId, cmd);
      setCmdResult(result);
    } catch {
      setCmdResult({ nodeId, command: cmd, output: 'Hata olustu', exitCode: 1, timestamp: Date.now() });
    }
    setExecuting(false);
  };

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-2 p-5 relative overflow-hidden"
      style={{
        borderColor: `${config.color}30`,
        borderWidth: 1,
        borderStyle: 'solid',
        background: `linear-gradient(180deg, ${config.color}05 0%, transparent 40%), rgba(15,15,26,0.6)`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 8px 32px ${config.color}15, 0 0 0 1px ${config.color}20`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm cursor-pointer hover:scale-110 transition-transform"
          style={{
            background: `${config.color}20`,
            border: `1px solid ${config.color}40`,
            color: config.color,
          }}
          onClick={() => onSelect(nodeId)}
          title="Detaylar icin tikla"
        >
          {config.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-display font-semibold text-vz-text">{config.name}</h3>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: connColor,
                boxShadow: `0 0 8px ${connColor}80`,
                animation: conn === 'connecting' ? 'pulse 1.5s infinite' : undefined,
              }}
            />
            <span className="text-[10px] text-vz-muted uppercase">{conn}</span>
          </div>
          <p className="text-[10px] text-vz-text-secondary truncate">
            {config.role} - {config.os} - {config.ip}
          </p>
        </div>
        <button
          onClick={() => onRefresh(nodeId)}
          disabled={refreshing}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-vz-surface/60 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={config.color} strokeWidth="2" strokeLinecap="round"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      {conn === 'online' && status && (
        <div className="space-y-3 mb-4">
          {status.ram && (
            <ProgressBar
              value={rp}
              color={ramColor}
              label="RAM"
              detail={`${formatRAM(status.ram)} (${rp}%)`}
            />
          )}
          {status.disk && (
            <ProgressBar
              value={status.disk.usedPercent}
              color={status.disk.usedPercent > 80 ? '#ff4444' : '#00ccff'}
              label="Disk"
              detail={`${status.disk.usedPercent}% kullanildi`}
            />
          )}
          {status.uptime && (
            <div className="flex justify-between text-[10px]">
              <span className="text-vz-text-secondary">Uptime</span>
              <span className="text-vz-text font-mono">{status.uptime}</span>
            </div>
          )}
        </div>
      )}

      {/* Services */}
      {status?.services && status.services.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[10px] text-vz-text-secondary uppercase tracking-wider mb-2">Servisler</h4>
          <div className="space-y-1.5">
            {status.services.map((svc) => (
              <div key={svc.name} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: svc.status === 'running' ? '#00ff88' : svc.status === 'error' ? '#ff4444' : '#6b7280',
                    boxShadow: `0 0 4px ${svc.status === 'running' ? '#00ff8860' : 'transparent'}`,
                  }}
                />
                <span className="text-vz-text flex-1 truncate">{svc.name}</span>
                {svc.memPercent && (
                  <span className="text-vz-muted font-mono text-[9px]">{svc.memPercent}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GG Agent Status */}
      {status?.gg_agent_status && (
        <div className="mb-4">
          <h4 className="text-[10px] text-vz-text-secondary uppercase tracking-wider mb-2">Good Guys Agent</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: '#a78bfa',
                  boxShadow: '0 0 4px #a78bfa60',
                }}
              />
              <span className="text-vz-text flex-1">
                {status.gg_agent_status.platform === 'codex' ? 'OpenClaw Codex' : 'Claude Code'}
              </span>
              <span className="text-vz-muted font-mono text-[9px]">
                {status.gg_agent_status.pc_id}
              </span>
            </div>
            {status.gg_agent_status.autonomous_cron && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#00ff88' }} />
                <span className="text-vz-text">Otonom Cron</span>
                <span className="text-vz-muted font-mono text-[9px]">aktif</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cron Jobs (VPS only) */}
      {status?.cronJobs && status.cronJobs.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[10px] text-vz-text-secondary uppercase tracking-wider mb-2">Cron Isler</h4>
          <div className="space-y-1.5">
            {status.cronJobs.map((job) => (
              <div key={job.name} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: job.lastStatus === 'ok' ? '#00ff88' : job.lastStatus === 'error' ? '#ff4444' : '#f59e0b',
                  }}
                />
                <span className="text-vz-text flex-1 truncate">{job.name}</span>
                {job.errors > 0 && (
                  <span className="text-[9px] text-vz-red font-mono">{job.errors}err</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command Input */}
      <div className="mt-3 pt-3 border-t border-vz-border/30">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExec()}
            placeholder={NODE_CONFIG.find(n => n.id === nodeId)?.sshAlias === null ? 'bash komutu...' : 'ssh komutu...'}
            className="flex-1 bg-vz-bg/80 text-vz-text text-[11px] px-2.5 py-1.5 rounded-md border border-vz-border/30 font-mono placeholder:text-vz-muted/40 focus:outline-none focus:border-vz-cyan/30"
          />
          <button
            onClick={handleExec}
            disabled={executing || !cmd.trim()}
            className="px-2.5 py-1.5 rounded-md text-[10px] font-display font-semibold transition-colors"
            style={{
              background: executing ? 'rgba(255,255,255,0.05)' : `${config.color}20`,
              border: `1px solid ${config.color}30`,
              color: config.color,
            }}
          >
            {executing ? '...' : 'Calistir'}
          </button>
        </div>
        {cmdResult && (
          <div className="mt-2 p-2 rounded-md bg-vz-bg/80 border border-vz-border/20 max-h-32 overflow-y-auto">
            <pre className="text-[10px] text-vz-text font-mono whitespace-pre-wrap break-all leading-relaxed">
              {cmdResult.output || '(bos cikti)'}
            </pre>
          </div>
        )}
      </div>

      {/* Last checked */}
      {status?.lastChecked ? (
        <div className="mt-2 text-right">
          <span className="text-[9px] text-vz-muted/50">
            Son kontrol: {formatTimestamp(status.lastChecked)}
          </span>
        </div>
      ) : null}

      {/* Error */}
      {status?.error && (
        <div className="mt-2 text-[10px] text-vz-red/80 truncate">
          {status.error}
        </div>
      )}
    </motion.div>
  );
};

// Main View
export const NodesView: React.FC = () => {
  const nodeStatuses = useSessionStore((s) => s.nodeStatuses);
  const [refreshing, setRefreshing] = useState<Set<NodeId>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);

  const getStatus = useCallback(
    (id: NodeId): NodeStatus | undefined => nodeStatuses.find((s) => s.nodeId === id),
    [nodeStatuses]
  );

  const handleRefresh = useCallback(async (id: NodeId) => {
    setRefreshing((prev) => new Set(prev).add(id));
    try {
      const result = await api().node.refresh(id);
      useSessionStore.getState().setNodeStatuses(
        useSessionStore.getState().nodeStatuses.map((s) => (s.nodeId === id ? result : s))
      );
    } catch {
      // Error handled silently
    }
    setRefreshing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleRefreshAll = useCallback(async () => {
    const ids = NODE_CONFIG.map(n => n.id);
    setRefreshing(new Set(ids));
    try {
      const results = await Promise.all(ids.map((id) => api().node.refresh(id)));
      useSessionStore.getState().setNodeStatuses(results);
    } catch {
      // Errors handled silently
    }
    setRefreshing(new Set());
  }, []);

  const handleExec = useCallback(async (id: NodeId, cmd: string) => {
    return api().node.exec(id, cmd);
  }, []);

  // Summary stats
  const onlineCount = nodeStatuses.filter((s) => s.connection === 'online').length;
  const totalRAM = nodeStatuses.reduce((sum, s) => sum + (s.ram?.totalMB || 0), 0);
  const usedRAM = nodeStatuses.reduce((sum, s) => sum + (s.ram?.usedMB || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0,204,255,0.2) 0%, rgba(0,255,136,0.2) 100%)',
              border: '1px solid rgba(0,204,255,0.3)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="8" height="8" rx="1" />
              <rect x="14" y="2" width="8" height="8" rx="1" />
              <rect x="8" y="14" width="8" height="8" rx="1" />
              <path d="M6 10v4M18 10v4M12 10v4" strokeDasharray="2 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-vz-text">Altyapi</h2>
            <p className="text-[10px] text-vz-text-secondary">
              {onlineCount}/{NODE_CONFIG.length} cevrimici
              {totalRAM > 0 && ` | Toplam RAM: ${(usedRAM / 1024).toFixed(1)}/${(totalRAM / 1024).toFixed(1)} GB`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1.5 text-[10px] font-display font-semibold transition-colors ${
                viewMode === '3d' ? 'bg-vz-cyan/15 text-vz-cyan' : 'text-vz-muted hover:text-vz-text'
              }`}
            >
              3D
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 text-[10px] font-display font-semibold transition-colors ${
                viewMode === 'grid' ? 'bg-vz-cyan/15 text-vz-cyan' : 'text-vz-muted hover:text-vz-text'
              }`}
            >
              Grid
            </button>
          </div>
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-display font-semibold text-vz-cyan hover:bg-vz-surface/60 transition-colors"
            style={{ border: '1px solid rgba(0,204,255,0.2)' }}
          >
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={refreshing.size === NODE_CONFIG.length ? 'animate-spin' : ''}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          Tumu Yenile
        </button>
        </div>
      </motion.div>

      {/* 3D Scene */}
      {viewMode === '3d' && (
        <motion.div
          key="3d"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-[300px] sm:h-[350px] lg:h-[420px] glass-2 rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(0,204,255,0.1)' }}
        >
          <Suspense fallback={
            <div className="w-full h-full flex flex-col items-center justify-center bg-vz-bg/60">
              <div className="w-8 h-8 border-2 border-vz-cyan/30 border-t-vz-cyan rounded-full animate-spin mb-3" />
              <span className="text-vz-muted text-xs font-display">3D sahne hazirlaniyor...</span>
            </div>
          }>
            <Node3DScene onDeviceClick={(id) => setSelectedNode(id)} />
          </Suspense>
        </motion.div>
      )}

      {/* Node Cards Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {NODE_CONFIG.map((config) => config.id).map((id) => (
          <NodeCard
            key={id}
            nodeId={id}
            status={getStatus(id)}
            onRefresh={handleRefresh}
            onExec={handleExec}
            onSelect={(nid) => setSelectedNode(nid)}
            refreshing={refreshing.has(id)}
          />
        ))}
      </motion.div>

      {/* Node Info Panel */}
      <NodeInfoPanel
        nodeId={selectedNode}
        status={selectedNode ? getStatus(selectedNode) : undefined}
        onClose={() => setSelectedNode(null)}
      />

      {/* Quick Actions */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="glass-2 p-5">
          <h3 className="text-xs font-display font-semibold text-vz-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            Hizli Islemler
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { label: 'VPS RAM', cmd: 'free -h', target: 'vps' as NodeId, color: '#00ff88' },
              { label: 'Chrome Temizle', cmd: 'bash /root/cleanup-chrome.sh', target: 'vps' as NodeId, color: '#f59e0b' },
              { label: 'Gateway Restart', cmd: 'pkill -f openclaw-gateway; sleep 2; cd /root && nohup openclaw-gateway > /dev/null 2>&1 &', target: 'vps' as NodeId, color: '#ff4444' },
              { label: 'PC2 Durum', cmd: 'systeminfo | findstr /B /C:"OS Name" /C:"Total Physical"', target: 'pc2' as NodeId, color: '#00ccff' },
              { label: 'PC4 Durum', cmd: 'systeminfo | findstr /B /C:"OS Name" /C:"Total Physical"', target: 'pc4' as NodeId, color: '#ec4899' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => handleExec(action.target, action.cmd)}
                className="p-2.5 rounded-lg text-left hover:bg-vz-surface/60 transition-colors group"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span
                  className="text-[10px] font-display font-semibold block mb-0.5"
                  style={{ color: action.color }}
                >
                  {action.label}
                </span>
                <span className="text-[9px] text-vz-muted/60 block truncate">
                  {NODE_CONFIG.find((n) => n.id === action.target)?.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
