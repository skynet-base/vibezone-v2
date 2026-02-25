import { useMemo } from 'react';
import type { Session, Task } from '@shared/types';

type Vec3 = [number, number, number];

export interface AgentCircleInfo {
  position: Vec3;
  baseAngle: number;
  circleRadius: number;
}

/**
 * Calculates static base positions for robots on a circle.
 * The actual animated angle is applied in RobotAgent via useFrame.
 * Returns a Map of sessionId -> AgentCircleInfo
 */
export function useAgentPositions(
  sessions: Session[],
  _tasks?: Task[]
): Map<string, Vec3> {
  const sessionIds = sessions.map((s) => s.id).join(',');

  return useMemo(() => {
    const positions = new Map<string, Vec3>();
    const count = sessions.length;

    if (count === 0) return positions;

    const radius = Math.max(2.0, count * 0.65);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.set(sessions[i].id, [x, 0, z]);
    }

    return positions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIds]);
}

/**
 * Returns per-robot base angles and circle radius for animated walking.
 */
export function useRobotCircleInfo(
  sessions: Session[],
  _tasks?: Task[]
): Map<string, AgentCircleInfo> {
  const sessionIds = sessions.map((s) => s.id).join(',');

  return useMemo(() => {
    const result = new Map<string, AgentCircleInfo>();
    const count = sessions.length;

    if (count === 0) return result;

    const radius = Math.max(2.0, count * 0.65);

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(baseAngle) * radius;
      const z = Math.sin(baseAngle) * radius;
      result.set(sessions[i].id, {
        position: [x, 0, z],
        baseAngle,
        circleRadius: radius,
      });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIds]);
}
