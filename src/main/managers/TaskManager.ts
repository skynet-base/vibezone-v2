import { randomUUID } from 'crypto';
import Store from 'electron-store';
import { Task, Activity, TaskStatus, TaskPriority } from '../../shared/types';

const MAX_ACTIVITIES = 500;
const MAX_TASKS = 500;
const VALID_STATUSES: TaskStatus[] = ['inbox', 'in_progress', 'in_review', 'done'];
const VALID_PRIORITIES: TaskPriority[] = ['none', 'low', 'medium', 'high'];

interface TaskStoreSchema {
  tasks: Task[];
  activities: Activity[];
}

export class TaskManager {
  private store: Store<TaskStoreSchema>;

  constructor() {
    this.store = new Store<TaskStoreSchema>({
      name: 'vibezone-tasks',
      defaults: {
        tasks: [],
        activities: [],
      },
    });

    // Validate stored data on startup - reset if corrupt
    this.validateStore();
  }

  private validateStore(): void {
    try {
      const tasks = this.store.get('tasks');
      const activities = this.store.get('activities');
      if (!Array.isArray(tasks) || !Array.isArray(activities)) {
        console.error('TaskManager: corrupt store detected, resetting to defaults');
        this.store.set('tasks', []);
        this.store.set('activities', []);
      }
    } catch (err) {
      console.error('TaskManager: failed to read store, resetting:', err);
      this.store.clear();
    }
  }

  // ── Task CRUD ──────────────────────────────────────────────

  getAllTasks(): Task[] {
    try {
      const tasks = this.store.get('tasks');
      return Array.isArray(tasks) ? tasks : [];
    } catch {
      return [];
    }
  }

  createTask(data: { title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; assigneeSessionId?: string; tags?: string[] }): Task {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new Error(`Invalid task status: ${data.status}`);
    }

    if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
      throw new Error(`Invalid task priority: ${data.priority}`);
    }

    const now = Date.now();
    const task: Task = {
      id: randomUUID(),
      title: data.title.trim(),
      description: typeof data.description === 'string' ? data.description : '',
      status: data.status ?? 'inbox',
      priority: data.priority ?? 'none',
      assigneeSessionId: data.assigneeSessionId,
      tags: Array.isArray(data.tags) ? data.tags.filter(t => typeof t === 'string') : [],
      createdAt: now,
      updatedAt: now,
    };

    let tasks = this.getAllTasks();
    tasks.push(task);

    if (tasks.length > MAX_TASKS) {
      const doneTasks = tasks.filter(t => t.status === 'done');
      const otherTasks = tasks.filter(t => t.status !== 'done');
      if (doneTasks.length > 0) {
        doneTasks.sort((a, b) => a.updatedAt - b.updatedAt);
        const toRemove = doneTasks.slice(0, Math.min(doneTasks.length, tasks.length - MAX_TASKS + 1));
        const removeIds = new Set(toRemove.map(t => t.id));
        tasks = otherTasks.concat(doneTasks.filter(t => !removeIds.has(t.id)));
      }
    }

    this.store.set('tasks', tasks);

    this.pushActivity({
      type: 'task_created',
      description: `Task created: ${task.title}`,
      taskId: task.id,
      icon: '\u{1F4CB}',
    });

    return task;
  }

  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    const tasks = this.getAllTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const existing = tasks[index];
    const oldStatus = existing.status;
    const oldAssignee = existing.assigneeSessionId;

    const updated: Task = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    tasks[index] = updated;
    this.store.set('tasks', tasks);

    // Auto-log status changes
    if (updates.status && updates.status !== oldStatus) {
      this.pushActivity({
        type: 'task_moved',
        description: `Task "${updated.title}" moved from ${oldStatus} to ${updates.status}`,
        taskId: id,
        icon: '\u{27A1}\uFE0F',
      });
    }

    // Auto-log assignment changes
    if (updates.assigneeSessionId !== undefined && updates.assigneeSessionId !== oldAssignee) {
      this.pushActivity({
        type: 'task_assigned',
        description: `Task "${updated.title}" assigned`,
        taskId: id,
        sessionId: updates.assigneeSessionId,
        icon: '\u{1F464}',
      });
    }

    return updated;
  }

  deleteTask(id: string): boolean {
    const tasks = this.getAllTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const filtered = tasks.filter(t => t.id !== id);
    this.store.set('tasks', filtered);

    const activities = this.store.get('activities');
    if (Array.isArray(activities)) {
      const filteredActivities = activities.filter(a => a.taskId !== id);
      this.store.set('activities', filteredActivities);
    }

    this.pushActivity({
      type: 'task_deleted',
      description: `Task deleted: ${task.title}`,
      taskId: id,
      icon: '\u{1F5D1}\uFE0F',
    });

    return true;
  }

  // ── Activity Log ───────────────────────────────────────────

  clearActivities(): void {
    this.store.set('activities', []);
  }

  getAllActivities(): Activity[] {
    try {
      const activities = this.store.get('activities');
      return Array.isArray(activities) ? activities : [];
    } catch {
      return [];
    }
  }

  pushActivity(data: { type: Activity['type']; description: string; sessionId?: string; taskId?: string; icon: string }): Activity {
    const activity: Activity = {
      id: randomUUID(),
      type: data.type,
      description: data.description,
      sessionId: data.sessionId,
      taskId: data.taskId,
      timestamp: Date.now(),
      icon: data.icon,
    };

    const activities = this.getAllActivities();
    activities.push(activity);

    // Keep only the most recent MAX_ACTIVITIES entries
    const trimmed = activities.length > MAX_ACTIVITIES
      ? activities.slice(activities.length - MAX_ACTIVITIES)
      : activities;

    this.store.set('activities', trimmed);
    return activity;
  }
}
