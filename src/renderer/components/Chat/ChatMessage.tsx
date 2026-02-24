import React from 'react';
import type { ChatMessage as ChatMessageType } from '@shared/types';

interface ChatMessageProps {
  message: ChatMessageType;
  agentColor: string;
}

export const ChatMessageBubble: React.FC<ChatMessageProps> = ({ message, agentColor }) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className="max-w-[80%] rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: isUser
            ? 'rgba(0, 204, 255, 0.12)'
            : `${agentColor}15`,
          borderLeft: isUser ? 'none' : `2px solid ${agentColor}60`,
          borderRight: isUser ? '2px solid rgba(0, 204, 255, 0.4)' : 'none',
        }}
      >
        <div className="text-[10px] font-medium mb-1" style={{
          color: isUser ? '#00ccff' : agentColor,
        }}>
          {isUser ? 'Sen' : 'Agent'}
        </div>
        <div className="text-vz-text/90 whitespace-pre-wrap break-words font-mono leading-relaxed">
          {message.content}
        </div>
        <div className="text-[9px] text-vz-muted mt-1 text-right">
          {time}
        </div>
      </div>
    </div>
  );
};
