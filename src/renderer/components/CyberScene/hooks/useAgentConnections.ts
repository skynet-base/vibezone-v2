import { useMemo } from 'react';
import type { Session, Task } from '@shared/types';

export interface AgentConnection {
  from: string; // sessionId
  to: string;   // sessionId
  taskId: string;
}

export function useAgentConnections(sessions: Session[], tasks: Task[]): AgentConnection[] {
  const sessionIds = sessions.map(s => s.id).join(',');
  const taskAssignees = tasks.map(t => `${t.id}:${t.assigneeSessionId || ''}`).join(',');

  return useMemo(() => {
    const connections: AgentConnection[] = [];

    // Group sessions by their assigned tasks
    const taskToSessions = new Map<string, string[]>();

    for (const task of tasks) {
      if (!task.assigneeSessionId) continue;
      // Find all tasks with same tags to create implicit groups
      const key = task.id;
      const existing = taskToSessions.get(key) || [];
      existing.push(task.assigneeSessionId);
      taskToSessions.set(key, existing);
    }

    // Also group by shared tags
    const tagToSessions = new Map<string, Set<string>>();
    for (const task of tasks) {
      if (!task.assigneeSessionId) continue;
      for (const tag of task.tags) {
        const set = tagToSessions.get(tag) || new Set();
        set.add(task.assigneeSessionId);
        tagToSessions.set(tag, set);
      }
    }

    // Create connections from tag groups
    const seen = new Set<string>();
    for (const [tag, sessionSet] of tagToSessions) {
      const sessionArr = Array.from(sessionSet).filter(id =>
        sessions.some(s => s.id === id)
      );
      for (let i = 0; i < sessionArr.length; i++) {
        for (let j = i + 1; j < sessionArr.length; j++) {
          const pairKey = [sessionArr[i], sessionArr[j]].sort().join(':');
          if (!seen.has(pairKey)) {
            seen.add(pairKey);
            connections.push({
              from: sessionArr[i],
              to: sessionArr[j],
              taskId: tag,
            });
          }
        }
      }
    }

    return connections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIds, taskAssignees]);
}
