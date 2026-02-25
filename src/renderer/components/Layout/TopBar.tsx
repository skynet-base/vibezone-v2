import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';

export const TopBar: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const sprintState = useSessionStore((s) => s.sprintState);
  const setSettingsModalOpen = useSessionStore((s) => s.setSettingsModalOpen);
  const { minimizeWindow, maximizeWindow, closeWindow } = useIPC();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.window.isMaximized().then(setMaximized);
  }, []);

  const handleMaximize = () => {
    maximizeWindow();
    setMaximized((m) => !m);
  };

  const { terminalCount, teamCount, activeCount } = useMemo(() => {
    let terminal = 0;
    let team = 0;
    let active = 0;
    for (const s of sessions) {
      if (!s.category || s.category === 'terminal') terminal++;
      if (s.category === 'team') team++;
      if (s.status === 'working') active++;
    }
    return { terminalCount: terminal, teamCount: team, activeCount: active };
  }, [sessions]);

  const sprintProgress = useMemo(() => {
    if (!sprintState || sprintState.stories.length === 0) return 0;
    return (sprintState.stories.filter(s => s.status === 'completed').length / sprintState.stories.length) * 100;
  }, [sprintState]);

  return (
    <div
      className="drag-region h-10 flex items-center justify-between glass-1 px-4 select-none"
      style={{ borderBottom: '1px solid rgba(0,204,255,0.2)' }}
    >
      {/* Left: Logo + stats */}
      <div className="flex items-center gap-3 no-drag">
        <span
          className="font-display font-bold text-sm tracking-wider text-vz-cyan"
          style={{ textShadow: '0 0 20px rgba(0,204,255,0.5)' }}
        >
          VIBEZONE
        </span>
        <div className="h-4 w-px bg-vz-border" />
        <div className="hidden md:flex items-center gap-2 text-xs text-vz-text-secondary">
          {terminalCount > 0 && (
            <span className="flex items-center gap-1" title="Terminal agent'lar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              {terminalCount}
            </span>
          )}
          {teamCount > 0 && (
            <>
              {terminalCount > 0 && <span className="text-vz-border">|</span>}
              <span className="flex items-center gap-1" title="Takim agent'lari">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {teamCount}
              </span>
            </>
          )}
          {activeCount > 0 && (
            <>
              <span className="text-vz-border">|</span>
              <span className="flex items-center gap-1.5 text-vz-green">
                <span className="w-1.5 h-1.5 rounded-full bg-vz-green pulse-dot" />
                {activeCount} aktif
              </span>
            </>
          )}
          {sessions.length === 0 && <span>Baslamaya hazir - agent ekleyerek baslayin</span>}
        </div>

        {/* Sprint info */}
        {sprintState && (
          <>
            <div className="hidden xl:block h-4 w-px bg-vz-border" />
            <div className="hidden xl:flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-vz-purple">Sprint #{sprintState.sprintNumber}</span>
                <span className="text-vz-text-secondary">
                  {sprintState.stories.filter(s => s.status === 'completed').length}/{sprintState.stories.length}
                </span>
              </div>
              <div className="w-full h-[2px] bg-vz-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${sprintProgress}%`,
                    background: 'linear-gradient(90deg, #00ccff, #8b5cf6)',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Center: spacer for drag */}
      <div className="flex-1" />

      {/* Right: Settings + Window Controls */}
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={() => setSettingsModalOpen(true)}
          className="p-1.5 rounded hover:bg-vz-border/50 text-vz-muted hover:text-vz-text transition-colors hover:shadow-neon-cyan"
          title="Ayarlar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>

        <div className="w-px h-4 bg-vz-border mx-1" />

        <button
          onClick={minimizeWindow}
          className="p-1.5 rounded hover:bg-vz-border/50 text-vz-muted hover:text-vz-text transition-colors hover:shadow-neon-cyan"
          title="Kucult"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="1.5" fill="currentColor" rx="0.5" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 rounded hover:bg-vz-border/50 text-vz-muted hover:text-vz-text transition-colors hover:shadow-neon-cyan"
          title={maximized ? 'Geri Yukle' : 'Buyut'}
        >
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="0" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" transform="translate(-1, 2)" />
              <rect x="0" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" transform="translate(0, -1)" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="0.5" y="0.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          )}
        </button>
        <button
          onClick={closeWindow}
          className="p-1.5 rounded hover:bg-red-500/30 text-vz-muted hover:text-vz-red transition-colors hover:shadow-neon-pink"
          title="Kapat"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};
