import React from 'react';
import { motion } from 'framer-motion';
import type { SprintState } from '@shared/types';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  todo: { label: 'Yapilacak', className: 'bg-vz-muted/20 text-vz-muted' },
  in_progress: { label: 'Devam Ediyor', className: 'bg-vz-cyan/20 text-vz-cyan' },
  completed: { label: 'Tamamlandi', className: 'bg-vz-green/20 text-vz-green' },
};

interface SprintCardProps {
  sprint: SprintState | null;
}

export const SprintCard: React.FC<SprintCardProps> = ({ sprint }) => {
  if (!sprint) {
    return (
      <div
        className="glass-2 neon-border-cyan p-5 flex-1 min-w-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,204,255,0.03) 0%, transparent 40%), rgba(15,15,26,0.6)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,204,255,0.15)', border: '1px solid rgba(0,204,255,0.25)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className="text-xs font-display font-semibold text-vz-text-secondary uppercase tracking-wider">
            Sprint
          </h3>
        </div>
        <div className="text-center py-4">
          <div
            className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center opacity-40"
            style={{ background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.15)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-xs text-vz-muted mb-1.5">
            Takim projesi bagli degil
          </p>
          <p className="text-[10px] text-vz-muted/50 leading-relaxed mb-3">
            Sprint takibi icin sol panelden "Takim Projesi Ice Aktar" ile bir proje baglayin
          </p>
          <div className="flex items-center gap-2 justify-center text-[10px] text-vz-cyan/60">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Sidebar &rarr; Takim Projesi Ice Aktar</span>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = sprint.stories.filter((s) => s.status === 'completed').length;
  const totalCount = sprint.stories.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const displayStories = sprint.stories.slice(0, 5);

  return (
    <div
      className="glass-2 neon-border-cyan p-5 flex-1 min-w-0 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(0,204,255,0.03) 0%, transparent 40%), rgba(15,15,26,0.6)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,204,255,0.15)', border: '1px solid rgba(0,204,255,0.25)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className="text-sm font-display font-semibold text-vz-text uppercase tracking-wider">
            Sprint #{sprint.sprintNumber}
          </h3>
        </div>
      </div>

      {/* Goal */}
      <p className="text-xs text-vz-text-secondary truncate mb-3" title={sprint.goal}>
        {sprint.goal}
      </p>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-vz-muted uppercase tracking-wider">Ilerleme</span>
          <span className="text-[11px] text-vz-text font-mono">
            {completedCount} / {totalCount} story
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-vz-border overflow-hidden relative">
          <motion.div
            className="h-full rounded-full relative"
            style={{
              background: 'linear-gradient(90deg, var(--color-cyan, #00ccff), var(--color-green, #00ff88))',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Velocity */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] text-vz-muted">
          Velocity:{' '}
          <span
            className="text-vz-cyan font-display font-bold text-sm"
            style={{ textShadow: '0 0 12px rgba(0,204,255,0.4)' }}
          >
            {sprint.velocity.completed}
          </span>
          {' / '}
          <span className="text-vz-muted">{sprint.velocity.planned} planli</span>
        </span>
      </div>

      {/* Story list */}
      {displayStories.length > 0 && (
        <div className="space-y-1.5 border-t border-vz-border/30 pt-2">
          {displayStories.map((story) => (
            <div
              key={story.id}
              className="flex items-center gap-2 text-[11px] py-1 rounded-md px-1 hover:bg-vz-surface/40 transition-colors"
            >
              {/* Priority dot with glow */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: PRIORITY_COLORS[story.priority],
                  boxShadow: `0 0 6px ${PRIORITY_COLORS[story.priority]}60`,
                }}
                title={story.priority}
              />

              {/* Title */}
              <span className="text-vz-text truncate flex-1 min-w-0">
                {story.title}
              </span>

              {/* Status badge */}
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  STATUS_BADGES[story.status]?.className ?? ''
                }`}
              >
                {STATUS_BADGES[story.status]?.label ?? story.status}
              </span>

              {/* Assigned agents */}
              {story.assignedTo.length > 0 && (
                <span className="text-[9px] text-vz-muted flex-shrink-0 max-w-[60px] truncate">
                  {story.assignedTo.join(', ')}
                </span>
              )}
            </div>
          ))}

          {sprint.stories.length > 5 && (
            <p className="text-[10px] text-vz-muted/60 text-center pt-1">
              +{sprint.stories.length - 5} daha
            </p>
          )}
        </div>
      )}
    </div>
  );
};
