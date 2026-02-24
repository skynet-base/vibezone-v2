import React, { useCallback } from 'react';
import type { Session } from '@shared/types';
import { AgentOrb } from './AgentOrb';

type Vec3 = [number, number, number];

interface AgentOrbsProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  positions: Map<string, Vec3>;
}

export const AgentOrbs: React.FC<AgentOrbsProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  positions,
}) => {
  const handleClick = useCallback(
    (sessionId: string) => {
      onSelectSession(sessionId);
    },
    [onSelectSession]
  );

  return (
    <group>
      {sessions.map((session) => {
        const pos = positions.get(session.id);
        if (!pos) return null;

        return (
          <AgentOrb
            key={session.id}
            session={session}
            position={pos}
            isActive={session.id === activeSessionId}
            onClick={handleClick}
          />
        );
      })}
    </group>
  );
};
