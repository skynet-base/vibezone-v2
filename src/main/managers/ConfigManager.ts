import Store from 'electron-store';
import { AppSettings, Session } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  minimizeToTray: true,
  quality: 'high',
  particlesEnabled: true,
  hookEnabled: false,
  sshHosts: [],
  recentProjects: [],
  localNodeId: undefined,
};

interface StoreSchema {
  settings: AppSettings;
  sessions: Session[];
}

export class ConfigManager {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'vibezone-v2',
      defaults: {
        settings: DEFAULT_SETTINGS,
        sessions: [],
      },
    });
  }

  getSettings(): AppSettings {
    return this.store.get('settings');
  }

  setSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const merged = { ...current, ...settings };
    this.store.set('settings', merged);
    return merged;
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.getSettings()[key];
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const settings = this.getSettings();
    settings[key] = value;
    this.store.set('settings', settings);
  }

  getSavedSessions(): Session[] {
    return this.store.get('sessions');
  }

  saveSessions(sessions: Session[]): void {
    this.store.set('sessions', sessions);
  }

  getWindowBounds(): AppSettings['windowBounds'] {
    return this.getSetting('windowBounds');
  }

  setWindowBounds(bounds: AppSettings['windowBounds']): void {
    this.setSetting('windowBounds', bounds);
  }
}
