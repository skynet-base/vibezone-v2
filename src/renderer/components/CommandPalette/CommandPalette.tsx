import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { AGENT_INFO } from '@shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 26, stiffness: 320, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -8,
    transition: { duration: 0.13, ease: 'easeIn' },
  },
};

// ─── Shortcut badge ───────────────────────────────────────────────────────────

const ShortcutBadge: React.FC<{ shortcut: string }> = ({ shortcut }) => {
  const keys = shortcut.split('+');
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <kbd
            className="
              inline-flex items-center justify-center
              min-w-[22px] h-[22px] px-1.5
              rounded text-[10px] font-mono font-medium
              bg-vz-bg border border-vz-border text-vz-muted
              leading-none
            "
          >
            {key}
          </kbd>
          {i < keys.length - 1 && (
            <span className="text-vz-muted/40 text-[10px]">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Category label ────────────────────────────────────────────────────────────

const CategoryLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3 pt-3 pb-1 flex items-center gap-2">
    <span className="text-[10px] font-display font-semibold tracking-widest uppercase text-vz-muted/60">
      {label}
    </span>
    <div className="flex-1 h-px bg-vz-border/40" />
  </div>
);

// ─── Result item ──────────────────────────────────────────────────────────────

const ResultItem: React.FC<{
  item: PaletteItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}> = ({ item, isSelected, onSelect, onHover }) => (
  <button
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
      text-left transition-all duration-100 group relative
      ${isSelected
        ? 'bg-vz-cyan/10 text-vz-text'
        : 'text-vz-text-secondary hover:bg-vz-surface-2/80 hover:text-vz-text'
      }
    `}
    onMouseEnter={onHover}
    onClick={onSelect}
  >
    {/* Left cyan accent */}
    <div
      className={`
        absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full
        transition-all duration-150
        ${isSelected ? 'h-5 bg-vz-cyan shadow-[0_0_6px_rgba(0,240,255,0.8)]' : 'h-0'}
      `}
    />

    {/* Icon */}
    {item.icon && (
      <span className="text-base w-5 text-center shrink-0 select-none">
        {item.icon}
      </span>
    )}

    {/* Label */}
    <span className="flex-1 text-sm font-medium truncate">{item.label}</span>

    {/* Shortcut badge */}
    {item.shortcut && <ShortcutBadge shortcut={item.shortcut} />}

    {/* Enter hint — show when selected */}
    {isSelected && !item.shortcut && (
      <kbd className="
        inline-flex items-center justify-center
        min-w-[22px] h-[22px] px-1.5
        rounded text-[10px] font-mono
        bg-vz-bg border border-vz-cyan/20 text-vz-cyan/60
        leading-none shrink-0
      ">
        ↵
      </kbd>
    )}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const CommandPalette: React.FC = () => {
  const commandPaletteOpen = useSessionStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useSessionStore((s) => s.setCommandPaletteOpen);
  const sessions = useSessionStore((s) => s.sessions);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const setActiveView = useSessionStore((s) => s.setActiveView);
  const setCreateAgentModalOpen = useSessionStore((s) => s.setCreateAgentModalOpen);
  const toggleTerminal = useSessionStore((s) => s.toggleTerminal);
  const setSettingsModalOpen = useSessionStore((s) => s.setSettingsModalOpen);
  const toggleSidebar = useSessionStore((s) => s.toggleSidebar);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, [setCommandPaletteOpen]);

  // ── Focus input on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (commandPaletteOpen) {
      // Slight delay ensures the mount animation doesn't steal focus
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // ── Global Ctrl+K shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (commandPaletteOpen) {
          close();
        } else {
          setCommandPaletteOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, close, setCommandPaletteOpen]);

  // ── Build palette items ────────────────────────────────────────────────────
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // --- Agentlar: active sessions ---
    sessions.forEach((s) => {
      const info = AGENT_INFO[s.agentType];
      items.push({
        id: `session-${s.id}`,
        label: s.name,
        category: 'Agentlar',
        icon: info?.emoji ?? '?',
        action: () => {
          setActiveSession(s.id);
          setActiveView('terminal');
          close();
        },
      });
    });

    // --- Gorunumler ---
    const views: { id: 'terminal' | 'tasks' | 'dashboard' | 'nodes'; label: string; icon: string; shortcut: string }[] = [
      { id: 'terminal', label: 'Terminal', icon: '>', shortcut: 'Ctrl+1' },
      { id: 'tasks', label: 'Gorevler', icon: '▦', shortcut: 'Ctrl+2' },
      { id: 'dashboard', label: 'Dashboard', icon: '⊞', shortcut: 'Ctrl+3' },
      { id: 'nodes', label: 'Altyapi', icon: '⬡', shortcut: 'Ctrl+4' },
    ];

    views.forEach((v) => {
      items.push({
        id: `view-${v.id}`,
        label: v.label,
        category: 'Gorunumler',
        icon: v.icon,
        shortcut: v.shortcut,
        action: () => {
          setActiveView(v.id);
          close();
        },
      });
    });

    // --- Komutlar ---
    items.push(
      {
        id: 'cmd-new-agent',
        label: 'Yeni Agent Ekle',
        category: 'Komutlar',
        icon: '+',
        shortcut: 'Ctrl+N',
        action: () => {
          setCreateAgentModalOpen(true);
          close();
        },
      },
      {
        id: 'cmd-terminal',
        label: 'Terminal Ac',
        category: 'Komutlar',
        icon: '>_',
        shortcut: 'Ctrl+`',
        action: () => {
          toggleTerminal();
          close();
        },
      },
      {
        id: 'cmd-settings',
        label: 'Ayarlar',
        category: 'Komutlar',
        icon: '⚙',
        shortcut: 'Ctrl+,',
        action: () => {
          setSettingsModalOpen(true);
          close();
        },
      },
      {
        id: 'cmd-sidebar',
        label: 'Sidebar Ac / Kapat',
        category: 'Komutlar',
        icon: '◧',
        action: () => {
          toggleSidebar();
          close();
        },
      }
    );

    // --- Kisayollar ---
    const shortcuts = [
      { id: 'shortcut-palette', label: 'Komut Paleti', shortcut: 'Ctrl+K' },
      { id: 'shortcut-new-agent', label: 'Yeni Agent', shortcut: 'Ctrl+N' },
      { id: 'shortcut-terminal', label: 'Terminal', shortcut: 'Ctrl+`' },
      { id: 'shortcut-settings', label: 'Ayarlar', shortcut: 'Ctrl+,' },
    ];

    shortcuts.forEach((s) => {
      items.push({
        id: s.id,
        label: s.label,
        category: 'Kisayollar',
        icon: '⌨',
        shortcut: s.shortcut,
        action: close,
      });
    });

    return items;
  }, [sessions, setActiveSession, setActiveView, setCreateAgentModalOpen, toggleTerminal, setSettingsModalOpen, toggleSidebar, close]);

  // ── Filter + group ─────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Group by category, preserving insertion order
  const groups = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filteredItems) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [filteredItems]);

  const flatList = useMemo(() => Array.from(groups.values()).flat(), [groups]);

  // Keep selected index in range
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(flatList.length - 1, 0)));
  }, [flatList.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelectorAll<HTMLButtonElement>('button[data-palette-item]')[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Keyboard nav ───────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(flatList.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + Math.max(flatList.length, 1)) % Math.max(flatList.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flatList[selectedIndex]?.action();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [flatList, selectedIndex, close]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            className="fixed inset-0 z-[60] no-drag"
            style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            key="cp-panel"
            className="fixed z-[61] no-drag"
            style={{
              top: '20%',
              left: '50%',
              x: '-50%',
              width: 'min(640px, 90vw)',
            }}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="
                rounded-2xl overflow-hidden
                border border-vz-border-glow/60
                shadow-[0_0_0_1px_rgba(0,240,255,0.06),0_24px_64px_rgba(0,0,0,0.7),0_0_40px_rgba(0,240,255,0.04)]
              "
              style={{
                background: 'rgba(8, 8, 18, 0.97)',
                backdropFilter: 'blur(32px) saturate(180%)',
              }}
              onKeyDown={handleKeyDown}
            >
              {/* Search row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-vz-border/50">
                {/* Magnifier icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0 text-vz-cyan/60"
                >
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75" />
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Ara..."
                  className="
                    flex-1 bg-transparent border-none outline-none
                    text-sm font-display text-vz-text placeholder:text-vz-muted/50
                  "
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Ctrl+K badge hint */}
                <ShortcutBadge shortcut="Esc" />
              </div>

              {/* Results list */}
              <div
                ref={listRef}
                className="overflow-y-auto"
                style={{ maxHeight: '420px' }}
              >
                {flatList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <span className="text-2xl opacity-30">?</span>
                    <p className="text-sm text-vz-muted">Sonuc bulunamadi</p>
                    <p className="text-xs text-vz-muted/50">Farkli bir arama deneyin</p>
                  </div>
                ) : (
                  <div className="p-2 pb-3">
                    {Array.from(groups.entries()).map(([category, items]) => {
                      // Calculate the start index of this category in flatList
                      const categoryStart = flatList.indexOf(items[0]);

                      return (
                        <div key={category}>
                          <CategoryLabel label={category} />
                          <div className="space-y-0.5 px-1">
                            {items.map((item, itemIdx) => {
                              const globalIdx = categoryStart + itemIdx;
                              return (
                                <ResultItem
                                  key={item.id}
                                  item={item}
                                  isSelected={globalIdx === selectedIndex}
                                  onSelect={item.action}
                                  onHover={() => setSelectedIndex(globalIdx)}
                                  // Pass data attr for scroll-into-view query
                                  {...{ 'data-palette-item': '' } as object}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer hint row */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-vz-border/40 bg-vz-bg/30">
                <div className="flex items-center gap-1.5 text-[11px] text-vz-muted/50">
                  <ShortcutBadge shortcut="↑" />
                  <ShortcutBadge shortcut="↓" />
                  <span>gezinme</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-vz-muted/50">
                  <ShortcutBadge shortcut="↵" />
                  <span>sec</span>
                </div>
                <div className="flex-1" />
                <span className="text-[11px] text-vz-muted/30 font-display tracking-wider">
                  VIBEZONE
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
