import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { TaskPriority } from '@shared/types';
import { AGENT_INFO } from '@shared/types';

interface NewTaskFormProps {
  onSubmit: (task: {
    title: string;
    description: string;
    priority: TaskPriority;
    assigneeSessionId?: string;
    tags: string[];
  }) => void;
  onCancel: () => void;
}

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  color: string;
  hint: string;
}[] = [
  { value: 'none', label: 'Belirtilmemis', color: '#6b7280', hint: 'Oncelik yok' },
  { value: 'low', label: 'Dusuk', color: '#3b82f6', hint: 'Zaman olunca' },
  { value: 'medium', label: 'Orta', color: '#eab308', hint: 'Normal oncelik' },
  { value: 'high', label: 'Acil', color: '#ef4444', hint: 'Hemen yapilmali' },
];

export const NewTaskForm: React.FC<NewTaskFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const sessions = useSessionStore((s) => s.sessions);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [assigneeSessionId, setAssigneeSessionId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      priority,
      assigneeSessionId: assigneeSessionId || undefined,
      tags: parsedTags,
    });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Title */}
      <div>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="w-full bg-transparent border-none outline-none text-base font-display font-semibold text-vz-text
            placeholder:text-vz-muted/50 p-0 border-b border-vz-border/30 pb-2"
          placeholder="Ornek: Ana sayfa tasarimini guncelle"
        />
      </div>

      {/* Description */}
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input-cyber resize-none text-xs"
          placeholder="Gorev hakkinda detayli bilgi yazin (opsiyonel)"
          rows={2}
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-[10px] text-vz-muted uppercase tracking-wider mb-1.5">
          Oncelik
        </label>
        <div className="flex gap-1.5">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              title={opt.hint}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                border transition-all ${
                  priority === opt.value
                    ? 'border-opacity-50'
                    : 'border-vz-border text-vz-muted hover:border-vz-muted/50'
                }`}
              style={
                priority === opt.value
                  ? {
                      color: opt.color,
                      borderColor: opt.color + '60',
                      backgroundColor: opt.color + '15',
                      boxShadow: `0 0 10px ${opt.color}20`,
                    }
                  : undefined
              }
            >
              {/* Colored dot instead of emoji */}
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: opt.color,
                  boxShadow: priority === opt.value ? `0 0 6px ${opt.color}60` : undefined,
                }}
              />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-[10px] text-vz-muted uppercase tracking-wider mb-1.5">
          Gorevi Kime Atayin?
        </label>
        <select
          value={assigneeSessionId}
          onChange={(e) => setAssigneeSessionId(e.target.value)}
          className="select-cyber text-xs"
        >
          <option value="">Henuz kimseye atanmasin</option>
          {sessions.map((session) => {
            const info = AGENT_INFO[session.agentType];
            return (
              <option key={session.id} value={session.id}>
                {info.emoji} {session.name} ({info.label})
              </option>
            );
          })}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-[10px] text-vz-muted uppercase tracking-wider mb-1.5">
          Etiketler
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input-cyber text-xs"
          placeholder="Ornek: frontend, bug, acil (virgul ile ayirin)"
        />
        {/* Tag Preview */}
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {parsedTags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded glass-1 text-vz-purple border border-vz-purple/15 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!title.trim()}
          className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Olustur
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary text-xs"
        >
          Iptal
        </button>
      </div>
    </form>
  );
};
