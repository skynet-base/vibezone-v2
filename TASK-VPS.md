# VPS (Timmy) Gorevleri — VibeZone v2 Upgrade
# Deadline: 10:00 AM TR
# Repo: /root/vibezone-v2
# Brief: .planning/VIBEZONE-UPGRADE-BRIEF.md

## Gorev 1: Resizable Panels (KRITIK BUG FIX)

### 1a. useSessionStore.ts — sidebarWidth state ekle
Dosya: src/renderer/hooks/useSessionStore.ts
- Interface'e ekle: sidebarWidth: number; setSidebarWidth: (w: number) => void;
- Default: sidebarWidth: 240
- setSidebarWidth: (width) => set({ sidebarWidth: width })

### 1b. App.tsx — Grid layout store'a bagla
Dosya: src/renderer/App.tsx

MEVCUT BUG (satir 104-111):
Grid templateRows sabit '1fr 300px' — terminalHeight store'dan okunmuyor.

FIX: App component icinde store'dan oku:
- terminalHeight, terminalOpen, sidebarWidth degerleri useSessionStore'dan alinacak
- gridTemplateColumns: sidebarWidth + 'px 1fr'
- gridTemplateRows: terminalOpen ? '1fr ' + terminalHeight + 'px' : '1fr'
- gridTemplateAreas: terminalOpen olmadığında '"sidebar main"' tek satir

Terminal kapali iken: terminal div'i renderlanmasin (conditional render)

### 1c. Sidebar Resize Handle
Dosya: src/renderer/components/Layout/Sidebar.tsx
- Sidebar container'in sag kenarinda 4px resize handle div ekle
- onMouseDown ile drag baslat
- mousemove'da sidebarWidth guncelle (min 180, max 400)
- mouseup'da drag bitir
- cursor: col-resize, hover'da border-vz-cyan/30

### 1d. Terminal Resize baglantisi
TerminalPanel'deki resize handle'i zaten var (handleResizeStart).
Sadece App.tsx'teki grid'in terminalHeight'i okumasini sagla (1b'de yapiliyor).

## Gorev 2: 3D Sahne Fix + Gelistirme

### 2a. CyberScene.tsx — Bos sahne durumu
Dosya: src/renderer/components/CyberScene/CyberScene.tsx
- SceneContent icinde: sessions.length === 0 ise "empty state" goster
- Bos state: drei Text ile "VIBEZONE" yazisi (buyuk, neon cyan, position 0,1.5,0)
- Altina kucuk Text: "Agent ekleyerek baslayin" (position 0,0.8,0, gri renk)
- Ambient particles arkada calismaya devam etsin

### 2b. Isik ve Fog iyilestirme
CyberScene.tsx:
- fog args: '#050508', 8, 20 --> '#050508', 12, 28
- ambientLight intensity: 0.15 --> 0.3

### 2c. DataColumns daha gorunur
Dosya: src/renderer/components/CyberScene/DataColumns.tsx
- DataColumn pulse opacity: 0.08 + 0.04 --> 0.15 + 0.08
- Mesh opacity: 0.1 --> 0.2

## Gorev 3: Koyu Coder Tonlari

### index.css degisiklikleri:
Dosya: src/renderer/index.css

- glass-card background: rgba(10, 10, 20, 0.6) --> rgba(6, 6, 14, 0.85)
- glass-2 background: rgba(15, 15, 26, 0.7) --> rgba(8, 8, 16, 0.88)
- glass-3 background: rgba(5, 5, 10, 0.85) --> rgba(4, 4, 10, 0.92)
- xterm padding: 8px --> 12px (daha rahat terminal)

## Son Adim: Build + Push

```
cd /root/vibezone-v2
npm install
npm run typecheck
npm run build
git add -A
git commit -m "feat: resizable panels, 3D scene fix, dark coder theme"
git push origin master
```
