import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useIPC } from '../../hooks/useIPC';
import { useSlashCommands } from '../../hooks/useSlashCommands';
import { terminalManager } from './TerminalManager';
import { ChatPanel } from '../Chat/ChatPanel';
import { AGENT_COLORS, AGENT_INFO } from '@shared/types';
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalInfoBar } from './TerminalInfoBar';
import { IPC } from '@shared/types';
import type { ChatMessage } from '@shared/types';

// Detect if a terminal line looks like a code execution command
const RUN_PATTERN = /^(python3?|node|ts-node|deno\s+run|bash|sh|ruby|go\s+run|cargo\s+run|npx|bun\s+run|php|perl|lua|Rscript|java|\.\/)/i;

// TODO(human): Map file extensions to run commands.
// Given a file path like "/home/user/script.py", return the shell command to run it.
// e.g. ".py" → `python3 "filepath"`, ".js" → `node "filepath"`, ".sh" → `bash "filepath"`
// Return null if the extension is unknown (user will be asked to type manually).
function getRunCommand(_filePath: string): string | null {
  const ext = _filePath.split('.').pop()?.toLowerCase() ?? '';
  // TODO(human): implement extension → command mapping here
  // Hint: use a Record<string, string> or switch statement
  // extensions to handle: py, js, ts, sh, rb, go, rs, java, php, r, lua, pl, c, cpp
  void ext;
  return null;
}

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
  const { sendInput, resizeSession, getSessionOutput, quickCreateShell, killSession } = useIPC();
  const { handleSlashCommand } = useSlashCommands();

  const [hasNewOutput, setHasNewOutput] = useState(false);
  const [showRunPicker, setShowRunPicker] = useState(false);

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

        // Auto-open chat when user runs code
        if ((data === '\r' || data === '\n') && RUN_PATTERN.test(inputBuffer.current)) {
          if (!useSessionStore.getState().chatOpen) {
            useSessionStore.getState().toggleChat();
          }
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
        // Notify user: new output arrived while chat is closed
        if (!useSessionStore.getState().chatOpen && clean.length > 30) {
          setHasNewOutput(true);
        }
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
      const timer = setTimeout(() => {
        terminalManager.fit(activeSessionId);
        terminalManager.focus(activeSessionId);
      }, 100);
      return () => clearTimeout(timer);
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

  // Run a file in the active terminal
  const handleRunFile = useCallback(async () => {
    if (!activeSessionId) return;
    setShowRunPicker(false);
    const filePath = await window.electronAPI.dialog.openFile([
      { name: 'Kod Dosyaları', extensions: ['py', 'js', 'ts', 'sh', 'rb', 'go', 'rs', 'java', 'php', 'r', 'lua', 'pl'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] },
    ]);
    if (!filePath) return;
    const normalized = filePath.replace(/\\/g, '/');
    const cmd = getRunCommand(normalized) ?? `"${normalized}"`;
    await sendInput(activeSessionId, cmd + '\n');
    if (!useSessionStore.getState().chatOpen) {
      useSessionStore.getState().toggleChat();
    }
  }, [activeSessionId, sendInput]);

  // Clear notification badge when chat is opened
  const handleToggleChat = useCallback(() => {
    setHasNewOutput(false);
    toggleChat();
  }, [toggleChat]);

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
      {terminalOpen && sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative flex flex-col h-full rounded-2xl overflow-hidden glass-card"
          style={{ boxShadow: 'var(--glass-shadow)' }}
          ref={containerRef}
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-vz-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="opacity-30">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 9L10 12L6 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm">Terminal yok</p>
            <button
              onClick={quickCreateShell}
              className="px-4 py-2 bg-vz-cyan/20 text-vz-cyan rounded-lg hover:bg-vz-cyan/30 transition-all duration-300 neon-border-cyan text-sm"
            >
              Terminal Ac
            </button>
          </div>
        </motion.div>
      )}
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
          <div className="relative z-10">
            <TerminalTabBar />
          </div>

          {/* Info bar */}
          {activeSession && (
            <div className="relative z-10">
              <TerminalInfoBar />
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
