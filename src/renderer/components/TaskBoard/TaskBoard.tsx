import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import type { Task, TaskStatus, TaskPriority } from '@shared/types';
import { TaskColumn } from './TaskColumn';
import { ActivityFeed } from './ActivityFeed';
import { NewTaskForm } from './NewTaskForm';

const COLUMNS: { status: TaskStatus; title: string; emoji: string }[] = [
  { status: 'inbox', title: 'Gelen Kutusu', emoji: '\uD83D\uDCE5' },
  { status: 'in_progress', title: 'Yapiliyor', emoji: '\uD83D\uDD28' },
  { status: 'in_review', title: 'Incelemede', emoji: '\uD83D\uDC40' },
  { status: 'done', title: 'Tamamlandi', emoji: '\u2705' },
];

export const TaskBoard: React.FC = () => {
  const tasks = useSessionStore((s) => s.tasks);
  const updateTaskInStore = useSessionStore((s) => s.updateTask);
  const addTaskToStore = useSessionStore((s) => s.addTask);
  const removeTaskFromStore = useSessionStore((s) => s.removeTask);
  const addActivity = useSessionStore((s) => s.addActivity);
  const { createTask, updateTask, deleteTask } = useIPC();

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDropTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      const oldStatus = task.status;
      // Optimistic update
      updateTaskInStore(taskId, { status: newStatus, updatedAt: Date.now() });

      try {
        await updateTask(taskId, { status: newStatus });
        addActivity({
          id: crypto.randomUUID(),
          type: 'task_moved',
          description: `"${task.title}" tasinildi: ${oldStatus} -> ${newStatus}`,
          taskId,
          timestamp: Date.now(),
          icon: '\uD83D\uDD04',
        });
      } catch (err) {
        // Rollback on failure
        updateTaskInStore(taskId, { status: oldStatus });
        console.error('Gorev tasima hatasi:', err);
      }

      setDraggedTaskId(null);
    },
    [tasks, updateTask, updateTaskInStore, addActivity]
  );

  const handleNewTask = useCallback(
    async (data: {
      title: string;
      description: string;
      priority: TaskPriority;
      assigneeSessionId?: string;
      tags: string[];
    }) => {
      try {
        const task = await createTask({
          title: data.title,
          description: data.description,
          status: 'inbox',
          priority: data.priority,
          assigneeSessionId: data.assigneeSessionId,
          tags: data.tags,
        });
        addTaskToStore(task);
        addActivity({
          id: crypto.randomUUID(),
          type: 'task_created',
          description: `Yeni gorev olusturuldu: "${task.title}"`,
          taskId: task.id,
          timestamp: Date.now(),
          icon: '\u2728',
        });
        setShowNewTaskForm(false);
      } catch (err) {
        console.error('Gorev olusturma hatasi:', err);
      }
    },
    [createTask, addTaskToStore, addActivity]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, update: Partial<Task>) => {
      updateTaskInStore(taskId, { ...update, updatedAt: Date.now() });
      try {
        await updateTask(taskId, update);
      } catch (err) {
        console.error('Gorev guncelleme hatasi:', err);
      }
    },
    [updateTask, updateTaskInStore]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      removeTaskFromStore(taskId);
      try {
        await deleteTask(taskId);
        if (task) {
          addActivity({
            id: crypto.randomUUID(),
            type: 'task_deleted',
            description: `Gorev silindi: "${task.title}"`,
            taskId,
            timestamp: Date.now(),
            icon: '\uD83D\uDDD1\uFE0F',
          });
        }
      } catch (err) {
        // Rollback: re-add task if delete fails
        if (task) addTaskToStore(task);
        console.error('Gorev silme hatasi:', err);
      }
    },
    [tasks, deleteTask, removeTaskFromStore, addTaskToStore, addActivity]
  );

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  }, []);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      inbox: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const t of tasks) {
      grouped[t.status].push(t);
    }
    return grouped;
  }, [tasks]);

  return (
    <div className="flex flex-col h-full bg-vz-bg">
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-5 py-3 glass-1"
        style={{
          borderBottom: '1px solid rgba(0,204,255,0.15)',
          boxShadow: '0 1px 8px rgba(0,204,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-semibold text-vz-text tracking-wide">
            Gorevler
          </h2>
          <span
            className="text-xs font-display font-bold px-2.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(0,204,255,0.15)',
              color: '#00ccff',
              boxShadow: '0 0 8px rgba(0,204,255,0.15)',
            }}
          >
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="btn-primary flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Gorev
          </button>
          <button
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className={`px-3 py-2 rounded-lg border text-xs transition-all ${
              showActivityFeed
                ? 'glass-1 text-vz-purple border-vz-purple/30'
                : 'bg-vz-surface text-vz-muted border-vz-border hover:border-vz-muted'
            }`}
            style={showActivityFeed ? { boxShadow: '0 0 8px rgba(139,92,246,0.15)' } : undefined}
            title={showActivityFeed ? 'Aktivite panelini gizle' : 'Aktivite panelini goster'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </button>
        </div>
      </div>

      {/* New Task Form */}
      <AnimatePresence>
        {showNewTaskForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-vz-border"
          >
            <div className="px-5 py-4 glass-1">
              <NewTaskForm
                onSubmit={handleNewTask}
                onCancel={() => setShowNewTaskForm(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Columns + Activity Feed */}
      <div className="flex flex-1 min-h-0">
        {/* Kanban Columns */}
        <div className="flex-1 flex flex-wrap lg:flex-nowrap gap-3 p-4 overflow-x-auto overflow-y-auto min-w-0 min-h-0 relative">
          {tasks.length === 0 && !showNewTaskForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            >
              {/* Geometric cyberpunk indicator */}
              <div
                className="w-16 h-16 rounded-xl mb-4 flex items-center justify-center opacity-40"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,204,255,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                  border: '1px solid rgba(0,204,255,0.15)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <p className="text-sm text-vz-muted mb-1 font-display">Gorev tahtaniz bos</p>
              <p className="text-xs text-vz-muted/50 mb-4 text-center max-w-xs leading-relaxed">
                Yapilacak isleri gorev olarak ekleyin ve agent'lara atayin. Gorevleri surukleyerek durumlarini degistirin.
              </p>
              <button
                onClick={() => setShowNewTaskForm(true)}
                className="btn-primary text-xs pointer-events-auto"
              >
                + Ilk Gorevi Olustur
              </button>
            </motion.div>
          )}
          {COLUMNS.map((col) => (
            <TaskColumn
              key={col.status}
              status={col.status}
              title={col.title}
              emoji={col.emoji}
              tasks={tasksByStatus[col.status]}
              onDropTask={handleDropTask}
              draggedTaskId={draggedTaskId}
              onDragStart={handleDragStart}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>

        {/* Activity Feed */}
        <AnimatePresence>
          {showActivityFeed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-vz-border overflow-hidden flex-shrink-0"
            >
              <ActivityFeed />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
