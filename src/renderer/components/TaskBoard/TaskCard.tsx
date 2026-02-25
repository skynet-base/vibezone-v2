import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { Task } from '@shared/types';
import { AGENT_INFO } from '@shared/types';

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, update: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  isDragging: boolean;
}

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  none: '#6b7280',
  low: '#3b82f6',
  medium: '#eab308',
  high: '#ef4444',
};

const PRIORITY_GLOW: Record<Task['priority'], string> = {
  none: '',
  low: 'inset 3px 0 8px -3px rgba(59,130,246,0.3)',
  medium: 'inset 3px 0 8px -3px rgba(234,179,8,0.3)',
  high: 'inset 3px 0 8px -3px rgba(255,68,68,0.3)',
};

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  none: 'Yok',
  low: 'Dusuk',
  medium: 'Orta',
  high: 'Yuksek',
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  onUpdate,
  onDelete,
  onDragStart,
  isDragging,
}) => {
  const sessions = useSessionStore((s) => s.sessions);
  const showConfirm = useSessionStore((s) => s.showConfirm);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const assignee = task.assigneeSessionId
    ? sessions.find((s) => s.id === task.assigneeSessionId)
    : null;

  const agentInfo = assignee ? AGENT_INFO[assignee.agentType] : null;

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      // Revert if title is empty
      setEditTitle(task.title);
      setEditDescription(task.description);
      setIsEditing(false);
      return;
    }
    onUpdate(task.id, {
      title: trimmedTitle,
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await showConfirm({
      title: 'Gorevi Sil',
      message: `"${task.title}" adli gorev kalici olarak silinecek.`,
      confirmText: 'Sil',
      variant: 'danger',
    });
    if (ok) onDelete(task.id);
  };

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = await showConfirm({
      title: 'Gorevi Sil',
      message: `"${task.title}" adli gorev kalici olarak silinecek.`,
      confirmText: 'Sil',
      variant: 'danger',
    });
    if (ok) onDelete(task.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, task.id);
  };

  const priorityColor = PRIORITY_COLORS[task.priority];
  const priorityGlow = PRIORITY_GLOW[task.priority];

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (!isEditing) setIsEditing(true);
      }}
      className={`group relative glass-1 rounded-lg cursor-grab
        transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95' : 'hover:brightness-110'}
        ${isEditing ? 'cursor-default ring-1 ring-vz-cyan/40' : ''}`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: priorityColor,
        boxShadow: priorityGlow || undefined,
        transform: isDragging ? undefined : 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging && !isEditing) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100
          text-vz-muted hover:text-vz-red hover:bg-vz-red/15 transition-all z-10"
        title="Gorevi sil"
      >
        <svg width="10" height="10" viewBox="0 0 12 12">
          <path
            d="M1 1L11 11M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="px-3 py-2.5">
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none text-xs font-semibold text-vz-text
                placeholder:text-vz-muted/50 p-0"
              placeholder="Gorev basligi..."
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-vz-surface/50 border border-vz-border/30 rounded text-[11px] text-vz-text/80
                placeholder:text-vz-muted/40 p-1.5 resize-none outline-none focus:border-vz-cyan/30"
              placeholder="Aciklama..."
              rows={2}
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveEdit}
                className="text-[10px] px-2 py-0.5 rounded bg-vz-cyan/20 text-vz-cyan border border-vz-cyan/30
                  hover:bg-vz-cyan/30 transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-[10px] px-2 py-0.5 rounded bg-vz-surface text-vz-muted border border-vz-border
                  hover:border-vz-muted transition-colors"
              >
                Iptal
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <>
            {/* Title */}
            <div className="text-xs font-semibold text-vz-text truncate pr-4">
              {task.title}
            </div>

            {/* Description preview */}
            {task.description && (
              <div className="text-[10px] text-vz-muted mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </div>
            )}

            {/* Footer: Assignee + Tags + Priority */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {/* Priority badge with glow */}
              {task.priority !== 'none' && (
                <span
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{
                    color: priorityColor,
                    backgroundColor: priorityColor + '20',
                    boxShadow: `0 0 6px ${priorityColor}25`,
                  }}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
              )}

              {/* Assignee with colored circle */}
              {assignee && agentInfo && (
                <span
                  className="text-[9px] flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{
                    color: agentInfo.color,
                    backgroundColor: agentInfo.color + '15',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: agentInfo.color,
                      boxShadow: `0 0 4px ${agentInfo.color}60`,
                    }}
                  />
                  <span className="font-medium">{assignee.name}</span>
                </span>
              )}

              {/* Tags */}
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-vz-purple/10 text-vz-purple border border-vz-purple/15 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
