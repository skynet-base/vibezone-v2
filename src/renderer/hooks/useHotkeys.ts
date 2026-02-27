import { useEffect } from 'react';
import { useSessionStore } from './useSessionStore';

export interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'terminal' | 'window' | 'agent';
}

// Export the hotkey registry so CommandPalette can display them
export const HOTKEY_REGISTRY: HotkeyConfig[] = [
  { key: 'k', ctrl: true, description: 'Command Palette aç/kapat', category: 'navigation', action: () => useSessionStore.getState().toggleCommandPalette() },
  { key: 'b', ctrl: true, description: 'Sağ sidebar aç/kapat', category: 'navigation', action: () => { const s = useSessionStore.getState(); s.setRightSidebarOpen(!s.rightSidebarOpen); } },
  { key: ',', ctrl: true, description: 'Ayarları aç', category: 'window', action: () => useSessionStore.getState().setSettingsModalOpen(true) },
  { key: '`', ctrl: true, description: 'Terminal aç/kapat', category: 'terminal', action: () => useSessionStore.getState().toggleTerminal() },
  { key: 'T', ctrl: true, shift: true, description: 'Yeni shell aç', category: 'terminal', action: () => { /* quickCreateShell — useIPC aracılığıyla tetiklenmeli */ } },
  { key: '1', ctrl: true, description: 'Terminal görünümüne geç', category: 'navigation', action: () => useSessionStore.getState().setActiveView('terminal') },
  { key: '2', ctrl: true, description: 'Tasks görünümüne geç', category: 'navigation', action: () => useSessionStore.getState().setActiveView('tasks') },
  { key: '3', ctrl: true, description: 'Dashboard görünümüne geç', category: 'navigation', action: () => useSessionStore.getState().setActiveView('dashboard') },
  { key: '4', ctrl: true, description: 'Nodes görünümüne geç', category: 'navigation', action: () => useSessionStore.getState().setActiveView('nodes') },
  { key: 'Tab', ctrl: true, description: 'Sonraki session', category: 'agent', action: () => { /* Tab cycling — useHotkeys handler içinde yönetilir */ } },
  { key: 'Tab', ctrl: true, shift: true, description: 'Önceki session', category: 'agent', action: () => { /* Tab cycling — useHotkeys handler içinde yönetilir */ } },
  { key: 'F11', description: 'Tam ekran aç/kapat', category: 'window', action: () => { /* window.electronAPI.window.toggleFullscreen — mevcut API'de yok */ } },
  // TODO: Ctrl+W (kill session) — window.electronAPI.session.kill gerektirir, useIPC aracılığıyla kullanın
  // TODO: Ctrl+R (restart session) — window.electronAPI.session.restart gerektirir, useIPC aracılığıyla kullanın
];

export function useHotkeys() {
  const store = useSessionStore;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if in input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Ctrl+K — Command Palette toggle
      if (ctrl && !shift && e.key === 'k') {
        e.preventDefault();
        store.getState().toggleCommandPalette();
        return;
      }

      // Ctrl+B — Right sidebar toggle
      if (ctrl && !shift && e.key === 'b') {
        e.preventDefault();
        const s = store.getState();
        s.setRightSidebarOpen(!s.rightSidebarOpen);
        return;
      }

      // Ctrl+W — Kill active session
      // TODO: window.electron?.session.kill mevcut API'de yok.
      // Bunun için useIPC().killSession(activeSessionId) kullanın.
      // if (ctrl && !shift && e.key === 'w') {
      //   e.preventDefault();
      //   const { activeSessionId } = store.getState();
      //   if (activeSessionId) {
      //     window.electronAPI.session.kill(activeSessionId);
      //     store.getState().removeSession(activeSessionId);
      //   }
      //   return;
      // }

      // Ctrl+, — Settings
      if (ctrl && !shift && e.key === ',') {
        e.preventDefault();
        store.getState().setSettingsModalOpen(true);
        return;
      }

      // Ctrl+R — Restart active session
      // TODO: window.electron?.session.restart mevcut API'de yok.
      // Bunun için useIPC().restartSession(activeSessionId) kullanın.
      // if (ctrl && !shift && e.key === 'r') {
      //   e.preventDefault();
      //   const { activeSessionId } = store.getState();
      //   if (activeSessionId) {
      //     window.electronAPI.session.restart(activeSessionId);
      //   }
      //   return;
      // }

      // F11 — Toggle fullscreen
      // TODO: window.electronAPI.window.toggleFullscreen mevcut preload API'sinde tanımlı değil.
      // if (e.key === 'F11') {
      //   e.preventDefault();
      //   window.electronAPI?.window.toggleFullscreen?.();
      //   return;
      // }

      // Ctrl+` — Terminal toggle
      if (ctrl && !shift && e.key === '`') {
        e.preventDefault();
        store.getState().toggleTerminal();
        return;
      }

      // Ctrl+Shift+T — New shell
      // TODO: quickCreateShell store'da değil, useIPC().quickCreateShell() olarak çağırın.
      // if (ctrl && shift && e.key === 'T') {
      //   e.preventDefault();
      //   store.getState().quickCreateShell?.();
      //   return;
      // }

      // Ctrl+1-4 — Tab switch
      if (ctrl && !shift && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const views = ['terminal', 'tasks', 'dashboard', 'nodes'] as const;
        const idx = parseInt(e.key) - 1;
        if (views[idx]) {
          store.getState().setActiveView(views[idx]);
        }
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — Next/prev session
      if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        const { sessions, activeSessionId, setActiveSession } = store.getState();
        if (sessions.length > 1 && activeSessionId) {
          const idx = sessions.findIndex(s => s.id === activeSessionId);
          const next = shift
            ? (idx - 1 + sessions.length) % sessions.length
            : (idx + 1) % sessions.length;
          setActiveSession(sessions[next].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// Helper to format shortcut for display
export function formatShortcut(config: { ctrl?: boolean; shift?: boolean; alt?: boolean; key: string }): string {
  const parts: string[] = [];
  if (config.ctrl) parts.push('Ctrl');
  if (config.shift) parts.push('Shift');
  if (config.alt) parts.push('Alt');
  parts.push(config.key.length === 1 ? config.key.toUpperCase() : config.key);
  return parts.join('+');
}
