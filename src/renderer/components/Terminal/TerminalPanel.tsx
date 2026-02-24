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
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: terminalHeight, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative flex flex-col bg-vz-bg border-t border-vz-border"
          ref={containerRef}
        >
          {/* Resize handle */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 group"
            onMouseDown={handleResizeStart}
          >
            <div
              className="absolute inset-x-0 top-0 h-px bg-vz-border group-hover:h-[2px] transition-all"
              style={{
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#00ccff';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(0,204,255,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Tab bar */}
          <div className="flex items-center h-8 bg-vz-bg px-2 gap-1 overflow-x-auto flex-shrink-0 border-b border-vz-border/50">
            {sessions.map((session) => {
              const agentColor = AGENT_COLORS[session.agentType] || '#5a5a78';
              const isActiveTab = activeSessionId === session.id;

              return (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                    isActiveTab
                      ? 'text-vz-text'
                      : 'text-vz-muted hover:text-vz-text hover:bg-vz-border/20'
                  }`}
                  style={isActiveTab ? {
                    backgroundColor: agentColor + '18',
                    boxShadow: `inset 0 0 12px ${agentColor}10`,
                  } : undefined}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[session.status] || '#6b7280' }}
                  />
                  <span
                    className="font-medium"
                    style={{
                      color: isActiveTab ? agentColor : undefined,
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
              className={`p-1 rounded transition-colors ${
                chatOpen
                  ? 'bg-vz-cyan/15 text-vz-cyan'
                  : 'text-vz-muted hover:text-vz-cyan hover:bg-vz-cyan/10'
              }`}
              title="Chat Paneli"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={quickCreateShell}
              className="p-1 rounded hover:bg-vz-green/15 text-vz-muted hover:text-vz-green transition-colors"
              title="Yeni Terminal (Ctrl+Shift+T)"
            >
              <svg width="10" height="10" viewBox="0 0 12 12">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={toggleTerminal}
              className="p-1 rounded hover:bg-vz-red/15 text-vz-muted hover:text-vz-red transition-colors hover:shadow-neon-pink"
              title="Terminal Kapat (Ctrl+`)"
            >
              <svg width="10" height="10" viewBox="0 0 12 12">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Info bar */}
          {activeSession && (
            <div className="flex items-center h-5 px-3 gap-2 bg-vz-bg-elevated/50 border-b border-vz-border/30 flex-shrink-0">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[activeSession.status] || '#6b7280' }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: AGENT_COLORS[activeSession.agentType] }}
              >
                {activeSession.name}
              </span>
              <span className="text-[10px] text-vz-muted">
                {activeSession.status}
              </span>
              <div className="w-px h-2.5 bg-vz-border" />
              <span className="text-[10px] text-vz-muted font-mono truncate">
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
