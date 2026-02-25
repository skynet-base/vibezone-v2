import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { SprintCard } from './SprintCard';
import { AgentTable } from './AgentTable';
import { staggerContainer, fadeUp } from '../../lib/animations';
import type { SessionStatus, TaskStatus } from '@shared/types';

const STATUS_DOT_COLORS: Record<SessionStatus, string> = {
  working: '#00ccff',
  idle: '#00ff88',
  waiting: '#f59e0b',
  offline: '#6b7280',
};

const TASK_STATUS_LABELS: Record<TaskStatus, { label: string; color: string; dotColor: string }> = {
  inbox: { label: 'Gelen', color: 'text-vz-muted', dotColor: '#5a5a78' },
  in_progress: { label: 'Devam', color: 'text-vz-cyan', dotColor: '#00ccff' },
  in_review: { label: 'Inceleme', color: 'text-vz-amber', dotColor: '#f59e0b' },
  done: { label: 'Bitti', color: 'text-vz-green', dotColor: '#00ff88' },
};

const ACTIVITY_ACCENT_COLORS: Record<string, string> = {
  task_created: '#00ff88',
  task_moved: '#00ccff',
  task_assigned: '#8b5cf6',
  task_deleted: '#ff4444',
  agent_started: '#00ccff',
  agent_stopped: '#6b7280',
  hook_event: '#f59e0b',
  sprint_update: '#8b5cf6',
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'az once';
  if (diffMin < 60) return `${diffMin}dk once`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}sa once`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}g once`;
}

export const DashboardView: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const tasks = useSessionStore((s) => s.tasks);
  const activities = useSessionStore((s) => s.activities);
  const sprintState = useSessionStore((s) => s.sprintState);
  const setCreateAgentModalOpen = useSessionStore((s) => s.setCreateAgentModalOpen);

  // Agent stats
  const agentStats = useMemo(() => {
    const total = sessions.length;
    const byStatus: Record<SessionStatus, number> = {
      working: 0,
      idle: 0,
      waiting: 0,
      offline: 0,
    };
    for (const session of sessions) {
      byStatus[session.status]++;
    }
    return { total, byStatus };
  }, [sessions]);

  // Task stats
  const taskStats = useMemo(() => {
    const byStatus: Record<TaskStatus, number> = {
      inbox: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };
    for (const task of tasks) {
      byStatus[task.status]++;
    }
    return byStatus;
  }, [tasks]);

  // Recent activities (last 20)
  const recentActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [activities]);

  const isEmpty = sessions.length === 0 && tasks.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Welcome banner when dashboard is empty */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-2 neon-border-cyan p-8 text-center relative overflow-hidden"
        >
          {/* Decorative gradient background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(0,204,255,0.15) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,204,255,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                border: '1px solid rgba(0,204,255,0.3)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 className="text-xl font-display font-bold text-vz-text mb-2">
              VibeZone'a Hos Geldiniz!
            </h2>
            <p className="text-sm text-vz-text-secondary mb-5 max-w-md mx-auto leading-relaxed">
              AI agent'larinizi buradan yonetebilirsiniz. Baslangic icin bir agent olusturun - agent'lar sizin icin kod yazacak, gorevleri tamamlayacak.
            </p>
            <button
              onClick={() => setCreateAgentModalOpen(true)}
              className="btn-primary text-sm px-6 py-2.5"
            >
              + Ilk Agent'imi Olustur
            </button>
          </div>
        </motion.div>
      )}

      {/* Top row - 3 summary cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Sprint Card */}
        <motion.div className="min-w-0" variants={fadeUp} whileHover={{ y: -2 }}>
          <SprintCard sprint={sprintState} />
        </motion.div>

        {/* Agent Card */}
        <motion.div className="min-w-0" variants={fadeUp} whileHover={{ y: -2 }}>
          <div
            className="glass-2 neon-border-green p-5 h-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(0,255,136,0.03) 0%, transparent 40%), rgba(15,15,26,0.6)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.25)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-xs font-display font-semibold text-vz-text-secondary uppercase tracking-wider">
                Agent'lar
              </h3>
              <span
                className="ml-auto text-3xl font-bold text-vz-green font-display"
                style={{ textShadow: '0 0 20px rgba(0,255,136,0.5)' }}
              >
                {agentStats.total}
              </span>
            </div>

            <div className="space-y-2.5">
              {(
                [
                  { key: 'working' as SessionStatus, label: 'Calisiyor' },
                  { key: 'idle' as SessionStatus, label: 'Bosta' },
                  { key: 'waiting' as SessionStatus, label: 'Bekliyor' },
                  { key: 'offline' as SessionStatus, label: 'Cevrimdisi' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: STATUS_DOT_COLORS[key],
                      boxShadow: `0 0 6px ${STATUS_DOT_COLORS[key]}60`,
                    }}
                  />
                  <span className="text-vz-text-secondary flex-1">{label}</span>
                  <span className="text-vz-text font-mono font-medium">
                    {agentStats.byStatus[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tasks Card */}
        <motion.div className="min-w-0" variants={fadeUp} whileHover={{ y: -2 }}>
          <div
            className="glass-2 neon-border-purple p-5 h-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(139,92,246,0.03) 0%, transparent 40%), rgba(15,15,26,0.6)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <h3 className="text-xs font-display font-semibold text-vz-text-secondary uppercase tracking-wider">
                Gorevler
              </h3>
              <span
                className="ml-auto text-3xl font-bold text-vz-purple font-display"
                style={{ textShadow: '0 0 20px rgba(139,92,246,0.5)' }}
              >
                {tasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, { label: string; color: string; dotColor: string }][]).map(
                ([status, { label, color, dotColor }]) => (
                  <div key={status} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: dotColor,
                        boxShadow: `0 0 6px ${dotColor}60`,
                      }}
                    />
                    <span className={`${color} flex-1`}>{label}</span>
                    <span className="text-vz-text font-mono font-medium">
                      {taskStats[status]}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Middle section - Agent Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <AgentTable />
      </motion.div>

      {/* Bottom section - Recent Activities */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="glass-2 p-5">
          <h3 className="text-sm font-display font-semibold text-vz-text uppercase tracking-wider mb-4 flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(0,204,255,0.15)', border: '1px solid rgba(0,204,255,0.25)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            Son Aktiviteler
          </h3>

          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <motion.div
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center opacity-40"
                style={{ background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.15)' }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.5, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </motion.div>
              <p className="text-xs text-vz-muted/60 mb-1">
                Henuz aktivite yok
              </p>
              <p className="text-[10px] text-vz-muted/40 leading-relaxed">
                Agent'lar calistiginda ve gorevler guncellediginde burada gorunecek
              </p>
            </div>
          ) : (
            <div className="relative space-y-0 max-h-[320px] overflow-y-auto pr-1">
              {/* Gradient timeline line */}
              <div
                className="absolute left-[5px] top-0 bottom-0 w-px"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,204,255,0.4) 0%, rgba(0,204,255,0.1) 60%, transparent 100%)',
                }}
              />
              {recentActivities.map((activity) => {
                const accentColor = ACTIVITY_ACCENT_COLORS[activity.type] || '#6b7280';
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-2.5 pl-4 relative hover:bg-vz-surface/40 rounded-r-lg transition-colors"
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                      style={{ backgroundColor: accentColor, opacity: 0.6 }}
                    />
                    {/* Colored dot replacing emoji */}
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}60` }}
                    />
                    <p className="text-xs text-vz-text flex-1 min-w-0 leading-relaxed">
                      {activity.description}
                    </p>
                    <span className="text-[10px] text-vz-muted flex-shrink-0 font-mono">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
