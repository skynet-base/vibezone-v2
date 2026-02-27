import React, { useState, useCallback, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { staggerContainer, fadeUp } from '../../lib/animations';
import { NODE_CONFIG } from '@shared/types';
import type { NodeId, NodeStatus, NodeCommandResult } from '@shared/types';
import { NodeInfoPanel } from './NodeInfoPanel';
import { useWidgetLayout } from '../../hooks/useWidgetLayout';
import { WidgetCard } from '../UI/WidgetCard';
import { CyberOrb } from '../UI/CyberOrb';

type ViewMode = '3d' | 'grid';

const api = () => window.electronAPI;
const LazyNode3DScene = lazy(async () => {
  const mod = await import('./Node3DScene');
  return { default: mod.Node3DScene };
});

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
      {/* Offline overlay */}
      {conn === 'offline' && (
        <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none rounded-2xl" />
      )}

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
            {conn === 'offline' && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-vz-red/20 text-vz-red font-medium">Cevrimdisi</span>
            )}
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
            className="px-2.5 py-1.5 rounded-md text-[10px] font-display font-semibold transition-colors disabled:opacity-50"
            style={{
              background: executing ? 'rgba(255,255,255,0.05)' : `${config.color}20`,
              border: `1px solid ${config.color}30`,
              color: config.color,
            }}
          >
            {executing ? (
              <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            ) : 'Calistir'}
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

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const NodesGridIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="2" width="8" height="8" rx="1" />
    <rect x="14" y="2" width="8" height="8" rx="1" />
    <rect x="8" y="14" width="8" height="8" rx="1" />
    <path d="M6 10v4M18 10v4M12 10v4" strokeDasharray="2 2" />
  </svg>
);

const QuickActionsIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ─── Quick Actions Content ─────────────────────────────────────────────────────

const QuickActionsContent: React.FC<{
  handleExec: (id: NodeId, cmd: string) => Promise<NodeCommandResult>;
  handleSwarmTest: () => void;
  swarmRunning: boolean;
  swarmResults: Array<{ nodeId: NodeId; label: string; status: 'idle' | 'running' | 'ok' | 'fail'; output: string }>;
  swarmOpen: boolean;
  setSwarmOpen: (v: boolean) => void;
}> = ({ handleExec, handleSwarmTest, swarmRunning, swarmResults, swarmOpen, setSwarmOpen }) => (
  <div className="p-4 overflow-y-auto h-full">
    {/* Swarm Test button */}
    <motion.button
      onClick={handleSwarmTest}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      disabled={swarmRunning}
      className="w-full mb-3 p-3 rounded-xl text-left flex items-center gap-3 transition-all"
      style={{
        background: swarmRunning
          ? 'rgba(0,240,255,0.04)'
          : 'linear-gradient(135deg, rgba(0,240,255,0.08) 0%, rgba(178,0,255,0.06) 100%)',
        border: `1px solid ${swarmRunning ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.25)'}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.2)' }}
      >
        {swarmRunning ? (
          <motion.div
            className="w-4 h-4 border-2 border-vz-cyan border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="3" cy="12" r="2" /><circle cx="21" cy="12" r="2" /><circle cx="12" cy="3" r="2" /><circle cx="12" cy="21" r="2" />
            <line x1="5" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="19" y2="12" />
            <line x1="12" y1="5" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="19" />
          </svg>
        )}
      </div>
      <div>
        <div className="text-xs font-semibold" style={{ color: '#00F0FF' }}>
          {swarmRunning ? 'Swarm çalışıyor...' : '3-PC Swarm Test'}
        </div>
        <div className="text-[10px] text-vz-muted mt-0.5">PC1 + PC2 + VPS paralel test dosyası yazar</div>
      </div>
      {swarmResults.length > 0 && !swarmRunning && (
        <button
          onClick={(e) => { e.stopPropagation(); setSwarmOpen(true); }}
          className="ml-auto text-[10px] px-2 py-1 rounded-md"
          style={{ color: '#00F0FF', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.15)' }}
        >
          Sonuçlar →
        </button>
      )}
    </motion.button>

    {/* Swarm Results panel */}
    <AnimatePresence>
      {swarmOpen && swarmResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-3 overflow-hidden"
        >
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(5,5,12,0.8)', border: '1px solid rgba(0,240,255,0.1)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-vz-muted uppercase tracking-widest">Swarm Sonuçları</span>
              <button onClick={() => setSwarmOpen(false)} className="text-vz-muted hover:text-vz-text text-xs">✕</button>
            </div>
            {swarmResults.map((r, i) => (
              <motion.div
                key={r.nodeId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {r.status === 'running' && (
                    <motion.div className="w-3 h-3 border border-vz-cyan border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  )}
                  {r.status === 'ok' && <span className="text-[#00ff88] text-xs">✓</span>}
                  {r.status === 'fail' && <span className="text-[#ff4444] text-xs">✗</span>}
                  {r.status === 'idle' && <span className="text-vz-muted text-xs">○</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold" style={{ color: r.status === 'ok' ? '#00ff88' : r.status === 'fail' ? '#ff4444' : '#00F0FF' }}>
                    {r.label}
                  </div>
                  {r.output && (
                    <div className="text-[9px] font-mono text-vz-muted mt-0.5 truncate">
                      {r.output.split('\n')[0]}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

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
);

// ─── Main View ────────────────────────────────────────────────────────────────

export const NodesView: React.FC = () => {
  const nodeStatuses = useSessionStore((s) => s.nodeStatuses);
  const [refreshing, setRefreshing] = useState<Set<NodeId>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const { layout, updateWidget, resetLayout } = useWidgetLayout('nodes');

  // Swarm Test state
  type SwarmResult = { nodeId: NodeId; label: string; status: 'idle' | 'running' | 'ok' | 'fail'; output: string };
  const [swarmRunning, setSwarmRunning] = useState(false);
  const [swarmResults, setSwarmResults] = useState<SwarmResult[]>([]);
  const [swarmOpen, setSwarmOpen] = useState(false);

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

  const handleSwarmTest = useCallback(async () => {
    if (swarmRunning) return;
    const WRITE_CMD = `node -e "const fs=require('fs'),os=require('os');const c='VZ Swarm Test OK\\nPC: '+os.hostname()+'\\nPlatform: '+process.platform+'\\nZaman: '+new Date().toISOString()+'\\n';fs.writeFileSync(os.homedir()+'/vz-swarm-test.txt',c);console.log('[OK] '+os.homedir()+'/vz-swarm-test.txt');console.log(c);"`;
    const targets: { nodeId: NodeId; label: string }[] = [
      { nodeId: 'pc1', label: 'PC1 (mlo)' },
      { nodeId: 'pc2', label: 'PC2 (Skynet)' },
      { nodeId: 'vps', label: 'VPS (srv)' },
    ];

    setSwarmRunning(true);
    setSwarmOpen(true);
    setSwarmResults(targets.map((t) => ({ ...t, status: 'running', output: '' })));

    const results = await Promise.allSettled(
      targets.map((t) => api().node.exec(t.nodeId, WRITE_CMD))
    );

    setSwarmResults(
      targets.map((t, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') {
          return { ...t, status: r.value.exitCode === 0 ? 'ok' : 'fail', output: r.value.output };
        }
        return { ...t, status: 'fail', output: String((r as PromiseRejectedResult).reason) };
      })
    );
    setSwarmRunning(false);
  }, [swarmRunning]);

  // Summary stats
  const onlineCount = nodeStatuses.filter((s) => s.connection === 'online').length;
  const totalRAM = nodeStatuses.reduce((sum, s) => sum + (s.ram?.totalMB || 0), 0);
  const usedRAM = nodeStatuses.reduce((sum, s) => sum + (s.ram?.usedMB || 0), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <motion.div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,204,255,0.08)' }}
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
            <NodesGridIcon />
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
              className={`px-2.5 py-1.5 text-[10px] font-display font-semibold transition-colors ${viewMode === '3d' ? 'bg-vz-cyan/15 text-vz-cyan' : 'text-vz-muted hover:text-vz-text'
                }`}
            >
              3D
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 text-[10px] font-display font-semibold transition-colors ${viewMode === 'grid' ? 'bg-vz-cyan/15 text-vz-cyan' : 'text-vz-muted hover:text-vz-text'
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
          <button
            onClick={resetLayout}
            className="text-[10px] text-vz-muted hover:text-vz-cyan transition-colors px-2 py-1.5 rounded hover:bg-vz-surface/40"
          >
            Duzeni Sifirla
          </button>
        </div>
      </motion.div>

      {/* 3D Scene (not a widget; spans full width conditionally) */}
      <AnimatePresence>
        {viewMode === '3d' && (
          <motion.div
            key="3d"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 overflow-hidden"
            style={{ border: '1px solid rgba(0,204,255,0.1)', margin: '0 20px' }}
          >
            <div className="h-[300px] sm:h-[350px] lg:h-[400px] glass-2 rounded-2xl overflow-hidden relative">
              <Suspense
                fallback={(
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-vz-bg/80 text-vz-muted">
                    <CyberOrb size={72} color="#00ccff" />
                    <span className="text-[11px] font-mono tracking-wide uppercase">
                      3D ag haritasi hazirlaniyor...
                    </span>
                  </div>
                )}
              >
                <LazyNode3DScene onDeviceClick={(nodeId) => setSelectedNode(nodeId)} />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget canvas for draggable panels */}
      <div ref={containerRef} className="flex-1 relative overflow-auto">
        {/* Node Cards Widget */}
        {layout['nodeCards'] && (
          <WidgetCard
            id="nodeCards"
            title="Altyapi Dugümleri"
            icon={<NodesGridIcon />}
            widgetState={layout['nodeCards']}
            onUpdate={(patch) => updateWidget('nodeCards', patch)}
            containerRef={containerRef}
            minWidth={400}
            minHeight={200}
          >
            <div className="p-4 overflow-y-auto h-full">
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
            </div>
          </WidgetCard>
        )}

        {/* Quick Actions Widget */}
        {layout['quickActions'] && (
          <WidgetCard
            id="quickActions"
            title="Hizli Islemler"
            icon={<QuickActionsIcon />}
            widgetState={layout['quickActions']}
            onUpdate={(patch) => updateWidget('quickActions', patch)}
            containerRef={containerRef}
            minWidth={300}
            minHeight={120}
          >
            <QuickActionsContent
              handleExec={handleExec}
              handleSwarmTest={handleSwarmTest}
              swarmRunning={swarmRunning}
              swarmResults={swarmResults}
              swarmOpen={swarmOpen}
              setSwarmOpen={setSwarmOpen}
            />
          </WidgetCard>
        )}
      </div>

      {/* Node Info Panel (overlay, not a widget) */}
      <NodeInfoPanel
        nodeId={selectedNode}
        status={selectedNode ? getStatus(selectedNode) : undefined}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};
