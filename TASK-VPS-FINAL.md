# TASK-VPS: Backend IPC + File Dialog + Preload Updates

**PC:** VPS (Worker — OpenCode)
**Branch:** `fix/vps-final-polish`
**Hedef:** File dialog IPC, yeni kanal destekleri, preload güncellemeleri

---

## GÖREV 1: File Dialog IPC Handler'ları

**Dosya:** `src/main/ipc/ipc-handlers.ts`

### Yapılacaklar:
1. `dialog:openFolder` handler ekle:
```typescript
ipcMain.handle('dialog:openFolder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Klasör Seç',
    });
    return result.canceled ? null : result.filePaths[0];
  } catch (err) {
    console.error('dialog:openFolder error:', err);
    return null;
  }
});
```
2. `dialog:openFile` handler ekle:
```typescript
ipcMain.handle('dialog:openFile', async (_e, filters?: { name: string; extensions: string[] }[]) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      title: 'Dosya Seç',
      filters: filters || [{ name: 'Tüm Dosyalar', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  } catch (err) {
    console.error('dialog:openFile error:', err);
    return null;
  }
});
```
3. `dialog:saveFile` handler ekle:
```typescript
ipcMain.handle('dialog:saveFile', async (_e, defaultPath?: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Dosya Kaydet',
      defaultPath,
    });
    return result.canceled ? null : result.filePath;
  } catch (err) {
    console.error('dialog:saveFile error:', err);
    return null;
  }
});
```

**Test:** `npx tsc --noEmit -p tsconfig.main.json` sıfır hata.

---

## GÖREV 2: Window Yönetim IPC

**Dosya:** `src/main/ipc/ipc-handlers.ts`

### Yapılacaklar:
1. `window:toggleFullscreen` handler:
```typescript
ipcMain.handle('window:toggleFullscreen', () => {
  try {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return mainWindow.isFullScreen();
    }
    return false;
  } catch (err) {
    console.error('window:toggleFullscreen error:', err);
    return false;
  }
});
```
2. `window:isFullscreen` handler:
```typescript
ipcMain.handle('window:isFullscreen', () => {
  try {
    return mainWindow?.isFullScreen() ?? false;
  } catch (err) {
    return false;
  }
});
```

**Test:** `npx tsc --noEmit -p tsconfig.main.json` sıfır hata.

---

## GÖREV 3: Preload API Güncellemesi

**Dosya:** `src/main/preload.ts`

### Yapılacaklar:
1. `dialog` namespace'i ekle:
```typescript
dialog: {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  openFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
},
```
2. `window` namespace'ine ekle:
```typescript
toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
```

**Test:** `npx tsc --noEmit -p tsconfig.main.json` sıfır hata.

---

## GÖREV 4: Electron Type Definitions

**Dosya:** `src/renderer/electron.d.ts`

### Yapılacaklar:
1. `dialog` interface ekle:
```typescript
dialog: {
  openFolder: () => Promise<string | null>;
  openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  saveFile: (defaultPath?: string) => Promise<string | null>;
};
```
2. `window` interface'ine ekle:
```typescript
toggleFullscreen: () => Promise<boolean>;
isFullscreen: () => Promise<boolean>;
```

**Test:** `npx tsc --noEmit -p tsconfig.main.json` sıfır hata.

---

## GÖREV 5: Session Shell Açılış CWD

**Dosya:** `src/main/managers/SessionManager.ts`

### Yapılacaklar:
1. `createSession` — CWD olarak home dizini kullan (eğer belirtilmemişse):
```typescript
const cwd = config.cwd && fs.existsSync(config.cwd) ? config.cwd : os.homedir();
```
2. Shell seçimi iyileştir:
```typescript
const shell = process.platform === 'win32'
  ? (process.env.COMSPEC || 'cmd.exe')
  : (process.env.SHELL || '/bin/bash');
```
3. PTY spawn hatası durumunda açıklayıcı hata mesajı dön:
```typescript
try {
  this.pty = pty.spawn(shell, [], { name: 'xterm-256color', cols, rows, cwd });
} catch (err) {
  throw new Error(`Terminal başlatılamadı: ${(err as Error).message}`);
}
```

**Test:** `npx tsc --noEmit -p tsconfig.main.json` sıfır hata.

---

## GÖREV 6: Tray Icon Düzeltme

**Dosya:** `src/main/index.ts`

### Yapılacaklar:
1. Boş ikon yerine gerçek ikon kullan:
```typescript
import { join } from 'path';

function createTray(): void {
  const iconPath = join(__dirname, '../../assets/icon.ico');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Fallback: create a simple 16x16 icon
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  // ... rest stays same
}
```
2. `assets/` klasöründe icon.ico varsa kullan, yoksa empty fallback

**Test:** `npx tsc --noEmit -p tsconfig.main.json` sıfır hata.

---

## Commit Stratejisi
```bash
git checkout -b fix/vps-final-polish
# Her görev için commit:
git add [dosyalar] && git commit -m "fix: [açıklama]"
# Bitince:
git push origin fix/vps-final-polish
```
