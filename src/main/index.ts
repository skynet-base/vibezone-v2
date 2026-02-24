import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { SessionManager } from './managers/SessionManager';
import { SSHManager } from './managers/SSHManager';
import { ProjectsManager } from './managers/ProjectsManager';
import { HookManager } from './managers/HookManager';
import { GitStatusManager } from './managers/GitStatusManager';
import { ConfigManager } from './managers/ConfigManager';
import { TaskManager } from './managers/TaskManager';
import { TeamImporter } from './managers/TeamImporter';
import { NodeMonitorManager } from './managers/NodeMonitorManager';
import { registerIPCHandlers } from './ipc/ipc-handlers';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Prevent crashes from unhandled errors in the main process
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in main process:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason);
});

// Managers
const configManager = new ConfigManager();
const sessionManager = new SessionManager();
const sshManager = new SSHManager(configManager);
const projectsManager = new ProjectsManager();
const hookManager = new HookManager();
const gitStatusManager = new GitStatusManager();
const taskManager = new TaskManager();
const teamImporter = new TeamImporter();
const nodeMonitor = new NodeMonitorManager();

const isDev = !app.isPackaged;
const DEV_PORT = process.env.VITE_DEV_PORT || '5173';

function createWindow(): void {
  const savedBounds = configManager.getWindowBounds();

  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 1400,
    height: savedBounds?.height || 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hidden',
    show: false,
    minWidth: 800,
    minHeight: 600,
  });

  // Load renderer
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${DEV_PORT}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
  });

  // Save window bounds on move/resize
  mainWindow.on('resized', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      configManager.setWindowBounds(mainWindow.getBounds());
    }
  });

  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      configManager.setWindowBounds(mainWindow.getBounds());
    }
  });

  // Handle close - minimize to tray or save sessions and quit
  mainWindow.on('close', (event) => {
    const settings = configManager.getSettings();

    // Save session state for persistence
    const sessions = sessionManager.getAllSessions();
    configManager.saveSessions(sessions);

    if (settings.minimizeToTray && tray) {
      event.preventDefault();
      mainWindow!.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register IPC handlers
  registerIPCHandlers(
    mainWindow,
    sessionManager,
    sshManager,
    projectsManager,
    hookManager,
    gitStatusManager,
    configManager,
    taskManager,
    teamImporter,
    nodeMonitor,
  );
}

function createTray(): void {
  // Create a simple 16x16 icon programmatically
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show VibeZone',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Force quit - don't minimize to tray
        if (mainWindow) {
          mainWindow.removeAllListeners('close');
          mainWindow.close();
        }
        app.quit();
      },
    },
  ]);

  tray.setToolTip('VibeZone v2');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function restoreSessions(): void {
  const savedSessions = configManager.getSavedSessions();
  for (const session of savedSessions) {
    sessionManager.restoreSession(session);
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createTray();
    restoreSessions();
    createWindow();

    // Start git status polling
    gitStatusManager.start();

    // Start node monitoring
    nodeMonitor.start();

    // Auto-setup hooks if enabled
    const settings = configManager.getSettings();
    if (settings.hookEnabled) {
      hookManager.setup().catch(() => {
        // Hook setup failed silently
      });
    }
  });

  app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until Cmd+Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    // Save sessions before quitting
    try {
      const sessions = sessionManager.getAllSessions();
      configManager.saveSessions(sessions);
    } catch (err) {
      console.error('Failed to save sessions on quit:', err);
    }

    // Cleanup - each in its own try/catch so one failure doesn't block others
    try { sessionManager.destroyAll(); } catch (err) { console.error('SessionManager cleanup failed:', err); }
    try { sshManager.destroyAll(); } catch (err) { console.error('SSHManager cleanup failed:', err); }
    try { gitStatusManager.stop(); } catch (err) { console.error('GitStatusManager cleanup failed:', err); }
    try { nodeMonitor.stop(); } catch (err) { console.error('NodeMonitor cleanup failed:', err); }
    try { hookManager.uninstall(); } catch (err) { console.error('HookManager cleanup failed:', err); }
    try { teamImporter.unwatchAll(); } catch (err) { console.error('TeamImporter cleanup failed:', err); }
  });
}
