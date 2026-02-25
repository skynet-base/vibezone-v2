import React from 'react';
import type { Session, Task } from '@shared/types';
import { WalkingRobotAgent } from './RobotAgent';
import { useRobotCircleInfo } from './hooks/useAgentPositions';

interface RobotAgentsProps {
  sessions: Session[];
  tasks: Task[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export const RobotAgents: React.FC<RobotAgentsProps> = ({
  sessions,
  tasks,
  activeSessionId,
  onSelectSession,
}) => {
  const circleInfoMap = useRobotCircleInfo(sessions, tasks);

  return (
    <group>
      {sessions.map((session, index) => {
        const info = circleInfoMap.get(session.id);
        if (!info) return null;

        return (
          <WalkingRobotAgent
            key={session.id}
            session={session}
            sessionIndex={index}
            baseAngle={info.baseAngle}
            circleRadius={info.circleRadius}
            isActive={session.id === activeSessionId}
            onClick={onSelectSession}
          />
        );
      })}
    </group>
  );
};
