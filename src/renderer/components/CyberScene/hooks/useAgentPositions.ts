import { useMemo } from 'react';
import type { Session, Task } from '@shared/types';

type Vec3 = [number, number, number];

export function useAgentPositions(sessions: Session[], tasks?: Task[]): Map<string, Vec3> {
  const sessionIds = sessions.map((s) => s.id).join(',');
  const taskKey = tasks?.map(t => `${t.id}:${t.assigneeSessionId || ''}:${t.tags.join('|')}`).join(',') || '';

  return useMemo(() => {
    const positions = new Map<string, Vec3>();
    const count = sessions.length;

    if (count === 0) return positions;

    // Find clusters: sessions working on shared tags
    const tagToSessions = new Map<string, Set<string>>();
    if (tasks) {
      for (const task of tasks) {
        if (!task.assigneeSessionId) continue;
        for (const tag of task.tags) {
          const set = tagToSessions.get(tag) || new Set();
          set.add(task.assigneeSessionId);
          tagToSessions.set(tag, set);
        }
      }
    }

    // Build cluster groups (sessions that share tags)
    const sessionToCluster = new Map<string, string>();
    const clusters = new Map<string, string[]>();

    for (const [tag, sessionSet] of tagToSessions) {
      const members = Array.from(sessionSet).filter(id => sessions.some(s => s.id === id));
      if (members.length >= 2) {
        for (const sid of members) {
          if (!sessionToCluster.has(sid)) {
            sessionToCluster.set(sid, tag);
            const existing = clusters.get(tag) || [];
            existing.push(sid);
            clusters.set(tag, existing);
          }
        }
      }
    }

    // Separate clustered vs unclustered sessions
    const unclustered = sessions.filter(s => !sessionToCluster.has(s.id));
    const clusterEntries = Array.from(clusters.entries());

    // Total "slots" on the main circle
    const totalSlots = unclustered.length + clusterEntries.length;
    const mainRadius = Math.max(1.5, totalSlots * 0.5);
    const clusterRadius = 0.8;

    let slotIndex = 0;

    // Place unclustered sessions
    for (const session of unclustered) {
      const angle = (slotIndex / Math.max(totalSlots, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * mainRadius;
      const z = Math.sin(angle) * mainRadius;
      positions.set(session.id, [x, 0.5, z]);
      slotIndex++;
    }

    // Place clusters
    for (const [, members] of clusterEntries) {
      const groupAngle = (slotIndex / Math.max(totalSlots, 1)) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(groupAngle) * mainRadius;
      const cz = Math.sin(groupAngle) * mainRadius;

      for (let j = 0; j < members.length; j++) {
        const subAngle = (j / members.length) * Math.PI * 2;
        const sx = cx + Math.cos(subAngle) * clusterRadius;
        const sz = cz + Math.sin(subAngle) * clusterRadius;
        positions.set(members[j], [sx, 0.5, sz]);
      }
      slotIndex++;
    }

    return positions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIds, taskKey]);
}
