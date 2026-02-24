import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { useSlashCommands } from '../../hooks/useSlashCommands';
import { terminalManager } from './TerminalManager';
import { ChatPanel } from '../Chat/ChatPanel';
import { AGENT_COLORS, AGENT_INFO } from '@shared/types';
import { IPC } from '@shared/types';
import type { ChatMessage } from '@shared/types';

const MIN_HEIGHT = 200;
const MAX_HEIGHT_RATIO = 0.7;

export const TerminalPanel: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const terminalOpen = useSessionStore((s) => s.terminalOpen);
  const toggleTerminal = useSessionStore((s) => s.toggleTerminal);
  const terminalHeight = useSessionStore((s) => s.terminalHeight);
  const setTerminalHeight = useSessionStore((s) => s.setTerminalHeight);
  const chatOpen = useSessionStore((s) => s.chatOpen);
  const toggleChat = useSessionStore((s) => s.toggleChat);
  const addChatMessage = useSessionStore((s) => s.addChatMessage);
  const { sendInput, resizeSession, getSessionOutput, quickCreateShell } = useIPC();
  const { handleSlashCommand } = useSlashCommands();

  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const resizing = useRef(false);
  const inputBuffer = useRef('');

  // Setup terminal manager handlers with slash command interception
  useEffect(() => {
    terminalManager.setHandlers(
      async (sessionId, data) => {
        // Buffer input for slash command detection
        if (data === '\r' || data === '\n') {
          const line = inputBuffer.current.trim();
          if (line.startsWith('/')) {
            const result = await handleSlashCommand(line);
            if (result.handled) {
              inputBuffer.current = '';
              // Write feedback to terminal
              const msg = result.error
                ? `\r\n\x1b[31m${result.error}\x1b[0m\r\n`
                : `\r\n${result.message}\r\n`;
              terminalManager.write(sessionId, msg);
              return;
            }
          }
          inputBuffer.current = '';
        } else if (data === '\x7f' || data === '\b') {
          // Backspace
          inputBuffer.current = inputBuffer.current.slice(0, -1);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          inputBuffer.current += data;
        }

        // Also capture user input as chat message
        if ((data === '\r' || data === '\n') && inputBuffer.current === '') {
          // Just sent, the buffer was already cleared
        }

        sendInput(sessionId, data);
      },
      (sessionId, cols, rows) => resizeSession(sessionId, cols, rows)
    );
  }, [sendInput, resizeSession, handleSlashCommand]);

  // Listen for output events + feed into chat
  useEffect(() => {
    const handleOutput = (...args: unknown[]) => {
      const [sessionId, data] = args as [string, string];
      terminalManager.write(sessionId, data);

      // Feed significant output into chat as agent messages
      const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
      if (clean.length > 2 && clean.length < 500) {
        addChatMessage(sessionId, {
          id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          sessionId,
          role: 'agent',
          content: clean,
          timestamp: Date.now(),
        });
      }
    };

    window.electronAPI.on(IPC.SESSION_OUTPUT, handleOutput);
    return () => {
      window.electronAPI.off(IPC.SESSION_OUTPUT, handleOutput);
    };
  }, [addChatMessage]);

  // Create terminals for new sessions
  useEffect(() => {
    for (const session of sessions) {
      if (!terminalManager.has(session.id)) {
        terminalManager.create(session.id);
        // Load existing output
        getSessionOutput(session.id).then((output) => {
          if (output) {
            terminalManager.write(session.id, output);
          }
        });
      }
    }
  }, [sessions, getSessionOutput]);

  // Mount/unmount active terminal
  useEffect(() => {
    if (!activeSessionId || !terminalOpen) return;

    const el = terminalRefs.current.get(activeSessionId);
    if (el) {
      terminalManager.mount(activeSessionId, el);
      // Auto-focus terminal so user can type immediately
      setTimeout(() => terminalManager.focus(activeSessionId), 100);
    }
  }, [activeSessionId, terminalOpen]);

  // Fit terminal on height change
  useEffect(() => {
    if (activeSessionId && terminalOpen) {
      setTimeout(() => terminalManager.fit(activeSessionId), 50);
    }
  }, [terminalHeight, activeSessionId, terminalOpen]);

  // Resize handle
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const onMove = (moveEvent: MouseEvent) => {
      if (!resizing.current) return;
      const delta = startY - moveEvent.clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const newHeight = Math.min(Math.max(startHeight + delta, MIN_HEIGHT), maxHeight);
      setTerminalHeight(newHeight);
    };

    const onUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (activeSessionId) {
        setTimeout(() => terminalManager.fit(activeSessionId), 50);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [terminalHeight, setTerminalHeight, activeSessionId]);

  // Terminal ref callback
  const setTerminalRef = useCallback((sessionId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      terminalRefs.current.set(sessionId, el);
      if (sessionId === activeSessionId && terminalOpen) {
        terminalManager.mount(sessionId, el);
      }
    }
  }, [activeSessionId, terminalOpen]);

  const STATUS_COLORS: Record<string, string> = {
    idle: '#00ff88',
    working: '#00ccff',
    waiting: '#f59e0b',
    offline: '#6b7280',
  };

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId),
    [sessions, activeSessionId]
  );

  return (
    <AnimatePresence>
      {terminalOpen && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative flex flex-col h-full rounded-2xl overflow-hidden glass-card group transition-shadow duration-500"
          style={{
            boxShadow: activeSession ? `0 0 20px ${AGENT_COLORS[activeSession.agentType] || '#00ccff'}30, inset 0 0 10px ${AGENT_COLORS[activeSession.agentType] || '#00ccff'}10` : 'var(--glass-shadow)',
            border: activeSession ? `1px solid ${AGENT_COLORS[activeSession.agentType] || '#00ccff'}40` : ''
          }}
          ref={containerRef}
        >
          {/* Subtle mesh overlay to match app style */}
          <div className="absolute inset-0 bg-mesh-glow opacity-30 pointer-events-none z-0"></div>

          {/* Tab bar */}
          <div className="relative z-10 flex items-center h-10 bg-vz-surface-2/40 backdrop-blur-md px-3 gap-2 overflow-x-auto flex-shrink-0 border-b border-vz-border/50">
            {sessions.map((session) => {
              const agentColor = AGENT_COLORS[session.agentType] || '#5a5a78';
              const isActiveTab = activeSessionId === session.id;

              return (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all duration-300 ${isActiveTab
                    ? 'text-vz-text'
                    : 'text-vz-muted hover:text-vz-text hover:bg-vz-surface-2'
                    }`}
                  style={isActiveTab ? {
                    backgroundColor: agentColor + '20',
                    border: `1px solid ${agentColor}50`,
                    boxShadow: `0 0 10px ${agentColor}30, inset 0 0 5px ${agentColor}20`,
                  } : { border: '1px solid transparent' }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[session.status] || '#6b7280', boxShadow: `0 0 5px ${STATUS_COLORS[session.status] || '#6b7280'}` }}
                  />
                  <span
                    className="font-medium"
                    style={{
                      color: isActiveTab ? agentColor : undefined,
                      textShadow: isActiveTab ? `0 0 8px ${agentColor}80` : undefined
                    }}
                  >
                    {session.name}
                  </span>
                </button>
              );
            })}

            {/* Spacer + Chat Toggle + Add + Close buttons */}
            <div className="flex-1" />
            <button
              onClick={toggleChat}
              className={`p-1.5 rounded-lg transition-all duration-300 ${chatOpen
                ? 'bg-vz-cyan/20 text-vz-cyan neon-border-cyan'
                : 'text-vz-muted hover:text-vz-cyan hover:bg-vz-surface-2'
                }`}
              title="Chat Paneli"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={quickCreateShell}
              className="p-1.5 rounded-lg hover:bg-vz-green/20 text-vz-muted hover:text-vz-green transition-all duration-300 hover:neon-border-green"
              title="Yeni Terminal (Ctrl+Shift+T)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={toggleTerminal}
              className="p-1.5 rounded-lg hover:bg-vz-red/20 text-vz-muted hover:text-vz-red transition-all duration-300 hover:neon-border-pink"
              title="Terminal Kapat (Ctrl+`)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Info bar */}
          {activeSession && (
            <div className="relative z-10 flex items-center h-6 px-4 gap-2 bg-vz-surface-2/20 backdrop-blur-sm border-b border-vz-border/30 flex-shrink-0">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[activeSession.status] || '#6b7280' }}
              />
              <span
                className="text-[10px] font-medium tracking-wide uppercase"
                style={{ color: AGENT_COLORS[activeSession.agentType] }}
              >
                {activeSession.name}
              </span>
              <span className="text-[10px] text-vz-muted uppercase tracking-wider">
                {activeSession.status}
              </span>
              <div className="w-px h-2.5 bg-vz-border/50" />
              <span className="text-[10px] text-vz-muted font-mono truncate opacity-60 hover:opacity-100 transition-opacity">
                {activeSession.cwd}
              </span>
            </div>
          )}

          {/* Terminal + Chat containers */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <div className="flex-1 flex overflow-hidden no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {/* Terminal area */}
            <div className={`relative overflow-hidden ${chatOpen ? 'flex-[6]' : 'flex-1'}`}>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  ref={setTerminalRef(session.id)}
                  className="absolute inset-0"
                  style={{
                    display: activeSessionId === session.id ? 'block' : 'none',
                  }}
                  onClick={() => {
                    terminalManager.focus(session.id);
                  }}
                />
              ))}
            </div>

            {/* Chat panel (side by side) */}
            {chatOpen && (
              <div className="flex-[4] min-w-0">
                <ChatPanel />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
