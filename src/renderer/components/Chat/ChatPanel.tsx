import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import { ChatMessageBubble } from './ChatMessage';
import { AGENT_INFO } from '@shared/types';
import type { ChatMessage } from '@shared/types';

const api = () => window.electronAPI;

export const ChatPanel: React.FC = () => {
  const chatOpen = useSessionStore((s) => s.chatOpen);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const chatMessages = useSessionStore((s) => s.chatMessages);
  const addChatMessage = useSessionStore((s) => s.addChatMessage);
  const toggleChat = useSessionStore((s) => s.toggleChat);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)
    : null;

  const messages = activeSessionId ? chatMessages.get(activeSessionId) || [] : [];
  const agentColor = activeSession ? AGENT_INFO[activeSession.agentType].color : '#00ccff';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activeSessionId) return;

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: activeSessionId,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    addChatMessage(activeSessionId, msg);
    setInput('');

    // Send to terminal PTY as stdin
    try {
      await api().session.sendInput(activeSessionId, trimmed + '\n');
    } catch (err) {
      console.error('Failed to send chat input:', err);
    }
  };

  const handleFileAttach = async () => {
    try {
      const filePath = await api().dialog.openFile([
        { name: 'Kod Dosyaları', extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'md', 'json', 'yaml', 'yml', 'txt', 'sh', 'css', 'html'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] },
      ]);
      if (filePath) {
        // Normalize path separators for cross-platform display
        const normalized = filePath.replace(/\\/g, '/');
        setInput((prev) => (prev ? `${prev} @${normalized}` : `@${normalized}`));
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('File attach error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      toggleChat();
    }
  };

  if (!chatOpen) return null;

  return (
    <div
      className="flex flex-col h-full border-l border-vz-border/50"
      style={{
        background: 'rgba(8, 8, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        minWidth: '280px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-vz-border/30">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: agentColor, boxShadow: `0 0 6px ${agentColor}60` }}
          />
          <span className="text-xs font-medium text-vz-text">
            {activeSession ? activeSession.name : 'Chat'}
          </span>
        </div>
        <button
          onClick={toggleChat}
          className="p-1 rounded hover:bg-vz-red/15 text-vz-muted hover:text-vz-red transition-colors"
          title="Chat Kapat"
        >
          <svg width="10" height="10" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-vz-muted">
              <div className="text-xs mb-1">Henuz mesaj yok</div>
              <div className="text-[10px]">Mesaj yazarak agent ile iletisim kurun</div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} agentColor={agentColor} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-vz-border/30">
        <div className="flex items-center gap-2">
          {/* File attach button */}
          <button
            onClick={handleFileAttach}
            disabled={!activeSessionId}
            className="p-1.5 rounded-lg text-vz-muted hover:text-vz-cyan hover:bg-vz-cyan/15
              border border-transparent hover:border-vz-cyan/30 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            title="Dosya Ekle"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-vz-surface/50 border border-vz-border/30 rounded-lg px-3 py-1.5
              text-xs text-vz-text placeholder:text-vz-muted/40
              outline-none focus:border-vz-cyan/40 transition-colors"
            placeholder={activeSession ? `${activeSession.name}'a mesaj yaz...` : 'Mesaj yaz...'}
            disabled={!activeSessionId}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !activeSessionId}
            className="px-2 py-1.5 rounded-lg text-xs font-medium
              bg-vz-cyan/15 text-vz-cyan border border-vz-cyan/30
              hover:bg-vz-cyan/25 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
