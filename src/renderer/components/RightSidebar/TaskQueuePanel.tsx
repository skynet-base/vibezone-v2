import React, { useMemo } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { AGENT_COLORS } from '@shared/types';
import type { TaskStatus } from '@shared/types';

const STATUS_ICONS: Partial<Record<TaskStatus, { icon: string; color: string }>> = {
  inbox:       { icon: '○', color: '#555578' },
  in_progress: { icon: '●', color: '#00CCFF' },
  in_review:   { icon: '◐', color: '#F59E0B' },
  done:        { icon: '✓', color: '#00FF88' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF3B5C',
  medium: '#00CCFF',
  low: '#555578',
  none: '#333350',
};

export const TaskQueuePanel: React.FC = () => {
  const tasks = useSessionStore((s) => s.tasks);
  const sessions = useSessionStore((s) => s.sessions);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        if (a.status === 'in_progress') return -1;
        if (b.status === 'in_progress') return 1;
        const p: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
        return (p[a.priority] ?? 3) - (p[b.priority] ?? 3);
      })
      .slice(0, 20);
  }, [tasks]);

  if (activeTasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-vz-muted/20 text-[10px] font-mono">Görev yok</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {activeTasks.map((task, i) => {
        const assignedSession = task.assigneeSessionId
          ? sessions.find((s) => s.id === task.assigneeSessionId)
          : null;
        const agentColor = assignedSession
          ? AGENT_COLORS[assignedSession.agentType] || '#555578'
          : '#333350';
        const statusConfig = STATUS_ICONS[task.status] || { icon: '○', color: '#555578' };
        const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none;

        return (
          <div
            key={task.id}
            className="relative px-3 py-1.5 border-b border-vz-border/30 hover:bg-vz-surface/30 transition-colors duration-100 cursor-pointer"
          >
            <div
              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
              style={{ backgroundColor: priorityColor }}
            />
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-[9px] font-mono text-vz-muted/50 w-5 flex-shrink-0">
                #{String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[11px] text-vz-text truncate flex-1 min-w-0">
                {task.title}
              </span>
              <span className="flex-shrink-0 text-[11px]" style={{ color: statusConfig.color }}>
                {statusConfig.icon}
              </span>
            </div>
            {assignedSession && (
              <div className="flex items-center gap-1 mt-0.5 pl-7">
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono"
                  style={{
                    backgroundColor: `${agentColor}18`,
                    color: agentColor,
                    border: `1px solid ${agentColor}30`,
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: agentColor }} />
                  {assignedSession.name}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
