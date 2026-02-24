import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { Activity } from '@shared/types';

type FilterType = 'all' | 'tasks' | 'agents';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Tumu' },
  { value: 'tasks', label: 'Gorevler' },
  { value: 'agents', label: "Agent'lar" },
];

const TASK_ACTIVITY_TYPES: Activity['type'][] = [
  'task_created',
  'task_moved',
  'task_assigned',
  'sprint_update',
];

const AGENT_ACTIVITY_TYPES: Activity['type'][] = [
  'agent_started',
  'agent_stopped',
  'hook_event',
];

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return `${seconds}sn once`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}dk once`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}sa once`;
  }

  const days = Math.floor(hours / 24);
  return `${days} gun once`;
}

function getActivityAccent(type: Activity['type']): string {
  switch (type) {
    case 'task_created':
      return '#00ff88';
    case 'task_moved':
      return '#00ccff';
    case 'task_assigned':
      return '#8b5cf6';
    case 'agent_started':
      return '#00ccff';
    case 'agent_stopped':
      return '#6b7280';
    case 'hook_event':
      return '#f59e0b';
    case 'sprint_update':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
}

export const ActivityFeed: React.FC = () => {
  const activities = useSessionStore((s) => s.activities);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (filter === 'tasks') {
      filtered = activities.filter((a) => TASK_ACTIVITY_TYPES.includes(a.type));
    } else if (filter === 'agents') {
      filtered = activities.filter((a) => AGENT_ACTIVITY_TYPES.includes(a.type));
    }

    // Sort newest first, limit to 100
    return [...filtered]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);
  }, [activities, filter]);

  return (
    <div className="flex flex-col h-full w-[280px] glass-1">
      {/* Header */}
      <div className="px-3 py-3 border-b border-vz-border/50">
        <h3 className="text-xs font-display font-semibold text-vz-text uppercase tracking-wider mb-2">
          Aktivite
        </h3>

        {/* Filter Buttons - pill shaped */}
        <div className="flex gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                filter === opt.value
                  ? 'text-vz-cyan border border-vz-cyan/30'
                  : 'text-vz-muted hover:text-vz-text border border-transparent hover:bg-vz-border/30'
              }`}
              style={
                filter === opt.value
                  ? {
                      background: 'rgba(0,204,255,0.15)',
                      boxShadow: '0 0 8px rgba(0,204,255,0.15)',
                    }
                  : undefined
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Gradient timeline line */}
        <div
          className="absolute left-3 top-0 bottom-0 w-px"
          style={{
            background: 'linear-gradient(180deg, rgba(0,204,255,0.3) 0%, rgba(0,204,255,0.05) 70%, transparent 100%)',
          }}
        />
        <AnimatePresence initial={false}>
          {filteredActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: 20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityItem activity={activity} />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredActivities.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-vz-muted/40">
            Henuz aktivite yok
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const accentColor = getActivityAccent(activity.type);

  return (
    <div className="flex gap-2.5 px-3 py-2.5 border-b border-vz-border/20 hover:bg-vz-surface/40 transition-colors relative">
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ backgroundColor: accentColor, opacity: 0.5 }}
      />

      {/* Colored circle replacing emoji */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 6px ${accentColor}60`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-vz-text/80 leading-relaxed break-words">
          {activity.description}
        </p>
        <span className="text-[9px] text-vz-muted font-mono mt-0.5 block">
          {formatRelativeTime(activity.timestamp)}
        </span>
      </div>
    </div>
  );
};
