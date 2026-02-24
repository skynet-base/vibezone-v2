import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, TaskStatus } from '@shared/types';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  emoji: string;
  tasks: Task[];
  onDropTask: (taskId: string, newStatus: TaskStatus) => void;
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onUpdateTask: (taskId: string, update: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const STATUS_ACCENT: Record<TaskStatus, string> = {
  inbox: '#6b7280',
  in_progress: '#00ccff',
  in_review: '#f59e0b',
  done: '#00ff88',
};

export const TaskColumn: React.FC<TaskColumnProps> = ({
  status,
  title,
  emoji,
  tasks,
  onDropTask,
  draggedTaskId,
  onDragStart,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!isDragOver) setIsDragOver(true);
    },
    [isDragOver]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if we are truly leaving the column (not entering a child)
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) {
        onDropTask(taskId, status);
      }
    },
    [onDropTask, status]
  );

  const accentColor = STATUS_ACCENT[status];

  return (
    <div
      className={`flex flex-col flex-1 min-w-[220px] max-w-[360px] glass-2 rounded-xl transition-all duration-200 ${
        isDragOver ? 'brightness-110' : ''
      }`}
      style={
        isDragOver
          ? {
              outline: `2px solid ${accentColor}`,
              outlineOffset: '-2px',
              boxShadow: `0 0 24px ${accentColor}30, inset 0 0 20px ${accentColor}08`,
            }
          : undefined
      }
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header - colored top border instead of bottom */}
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderTop: `2px solid ${accentColor}` }}
      >
        <span
          className="text-xs font-display font-semibold uppercase tracking-wider"
          style={{ color: accentColor }}
        >
          {title}
        </span>
        <span
          className="text-[10px] font-display font-bold ml-auto px-2 py-0.5 rounded-md"
          style={{
            color: accentColor,
            backgroundColor: accentColor + '20',
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {tasks
            .sort((a, b) => {
              // Sort by priority weight descending, then by updatedAt descending
              const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
              const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
              if (pDiff !== 0) return pDiff;
              return b.updatedAt - a.updatedAt;
            })
            .map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <TaskCard
                  task={task}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                  onDragStart={onDragStart}
                  isDragging={draggedTaskId === task.id}
                />
              </motion.div>
            ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-center select-none px-3">
            {isDragOver ? (
              <span className="text-xs font-display font-medium" style={{ color: accentColor }}>
                Buraya birak
              </span>
            ) : (
              <>
                {/* Geometric indicator instead of emoji */}
                <div
                  className="w-6 h-6 rounded-md mb-2 flex items-center justify-center opacity-30"
                  style={{
                    border: `1px solid ${accentColor}40`,
                    background: `${accentColor}10`,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: `${accentColor}50` }}
                  />
                </div>
                <span className="text-[10px] text-vz-muted/40 leading-relaxed">
                  {status === 'inbox' && 'Yeni gorevler burada goruntulenir'}
                  {status === 'in_progress' && 'Gorevleri buraya surukleyin'}
                  {status === 'in_review' && 'Inceleme bekleyen gorevler'}
                  {status === 'done' && 'Tamamlanan gorevler burada'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
