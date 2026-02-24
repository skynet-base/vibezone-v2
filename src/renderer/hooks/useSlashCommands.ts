import { useCallback } from 'react';
import { useSessionStore } from './useSessionStore';
import { useToastStore } from './useToastStore';
import type { TaskPriority } from '@shared/types';

const api = () => window.electronAPI;

interface SlashCommandResult {
  handled: boolean;
  message?: string;
  error?: string;
}

export function useSlashCommands() {
  const handleSlashCommand = useCallback(async (input: string): Promise<SlashCommandResult> => {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return { handled: false };

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      case '/task': {
        const rest = parts.slice(1).join(' ');
        if (!rest) {
          return { handled: true, error: 'Kullanim: /task <baslik> [@agent] [#etiket] [!high|!medium|!low]' };
        }

        // Parse modifiers
        let title = rest;
        let assigneeSessionId: string | undefined;
        const tags: string[] = [];
        let priority: TaskPriority = 'none';

        // Extract @agent
        const agentMatch = rest.match(/@(\S+)/);
        if (agentMatch) {
          const agentName = agentMatch[1];
          const sessions = useSessionStore.getState().sessions;
          const found = sessions.find(
            (s) => s.name.toLowerCase() === agentName.toLowerCase()
          );
          if (found) {
            assigneeSessionId = found.id;
          }
          title = title.replace(/@\S+/, '').trim();
        }

        // Extract #tags
        const tagMatches = rest.matchAll(/#(\S+)/g);
        for (const match of tagMatches) {
          tags.push(match[1]);
          title = title.replace(`#${match[1]}`, '').trim();
        }

        // Extract !priority
        const priorityMatch = rest.match(/!(high|medium|low)/i);
        if (priorityMatch) {
          priority = priorityMatch[1].toLowerCase() as TaskPriority;
          title = title.replace(/!\S+/, '').trim();
        }

        if (!title) {
          return { handled: true, error: 'Gorev basligi bos olamaz' };
        }

        try {
          await api().task.create({
            title,
            description: '',
            status: 'inbox',
            priority,
            assigneeSessionId,
            tags,
          });

          // Update local store
          const tasks = await api().task.getAll();
          useSessionStore.getState().setTasks(tasks);

          useToastStore.getState().addToast({
            message: `Gorev eklendi: ${title}`,
            type: 'success',
          });

          return {
            handled: true,
            message: `\x1b[32m✓ Gorev eklendi: ${title}\x1b[0m`,
          };
        } catch (err: any) {
          return {
            handled: true,
            error: `Gorev eklenemedi: ${err?.message || 'Bilinmeyen hata'}`,
          };
        }
      }

      case '/status': {
        const activeSessionId = useSessionStore.getState().activeSessionId;
        const sessions = useSessionStore.getState().sessions;
        const active = sessions.find((s) => s.id === activeSessionId);
        if (active) {
          return {
            handled: true,
            message: `\x1b[36m${active.name}\x1b[0m | Durum: ${active.status} | Konum: ${active.cwd}`,
          };
        }
        return { handled: true, message: 'Aktif agent yok' };
      }

      case '/agents': {
        const sessions = useSessionStore.getState().sessions;
        if (sessions.length === 0) {
          return { handled: true, message: 'Hic agent yok' };
        }
        const lines = sessions.map(
          (s) => `  \x1b[36m${s.name}\x1b[0m [${s.status}] - ${s.agentType}`
        );
        return {
          handled: true,
          message: `\x1b[1mAgent Listesi:\x1b[0m\n${lines.join('\n')}`,
        };
      }

      default:
        return { handled: false };
    }
  }, []);

  const getCommandSuggestions = useCallback((input: string): string[] => {
    if (!input.startsWith('/')) return [];
    const commands = ['/task', '/status', '/agents'];
    return commands.filter((cmd) => cmd.startsWith(input.toLowerCase()));
  }, []);

  return { handleSlashCommand, getCommandSuggestions };
}
