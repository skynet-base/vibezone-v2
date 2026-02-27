# VibeZone v3 — Kapsamlı Tasarım Dokümanı
> 2026-02-26 | Onaylanan Tasarım

---

## Vizyon

Terminal-first AI agent workspace. Warp benzeri terminal birincil araç; sağda 3D chibi robot sahnesi ambient/dekoratif. 3 PC (PC1/PC2/VPS) üzerindeki tüm canlı agentlar sahnede görselleştiriliyor.

---

## Bölüm 1: Layout Mimarisi

### Mevcut → Yeni

```
MEVCUT:
+──────────────+────────────────────────────────+
│  Left Sidebar│  [Sahne|Görevler|Dashboard|Alt] │
│  (240px)     │  Main Content (tab'a göre)      │
│              ├────────────────────────────────┤
│              │  Terminal (bottom strip, toggle)│
+──────────────+────────────────────────────────+

YENİ:
+──────────────+───────────────────────────────+──────────────+
│  Left Rail   │  [Terminal*|Görevler|Dashboard│  3D Agent    │
│  Session List│   |Altyapı]                   │  Scene       │
│  (240px)     │─────────────────────────────── │  Sidebar     │
│              │                               │  (220px)     │
│  Agent item  │  Active View Content          │  CompactScene│
│  + status    │  Terminal = full Warp-like    │  Chibi Robots│
│              │  Tasks = kanban + queue       │  Always on   │
│              │  Dashboard = PC health        │              │
+──────────────+───────────────────────────────+──────────────+
```

### Grid (App.tsx değişikliği)
```css
grid-template-columns: {leftWidth}px 1fr 220px
grid-template-rows: 1fr  /* terminal alt şerit kaldırılıyor */
grid-areas: "sidebar main scene"
```

### Değişiklikler
- **"Sahne" tab KALDIRILDI** → CyberScene komponenti siliniyor
- **"Terminal" tab EKLENDİ** → Tam ekran Warp-like terminal (yeni PrimaryTerminalView)
- **Alt terminal şeridi KALDIRILDI** → Terminal artık tam view
- **Sağ 3D sidebar EKLENDİ** → `AgentSceneSidebar.tsx` (220px, sabit)
- **Sol sidebar KORUNUYOR** → Session list aynen kalıyor

---

## Bölüm 2: Terminal (Warp-like) — EN KRİTİK PARÇA

### Mevcut Sorunlar
- Bottom strip: çok küçük, secondary hissettiriyor
- Warp'ın command blocks özelliği yok
- Sekme çubuğu sıkışık

### Yeni: PrimaryTerminalView.tsx

#### Command Block Sistemi
Her komut + çıktısı tek bir "blok" olarak gruplandırılır:
```
┌─────────────────────────────────────────────────────┐
│ > claude --resume                        [0.2s] ✓   │ ← command header
│ ─────────────────────────────────────────────────── │
│ Resuming session abc123...                           │
│ Claude Code ready.                                   │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ > git status                             [0.1s] ✓   │
│ ─────────────────────────────────────────────────── │
│ On branch main                                      │
│ nothing to commit                                   │
└─────────────────────────────────────────────────────┘
```

#### Tab Bar (Warp-style)
```
[● Claude  claude-code  ×] [● Shell  ~  ×] [● OpenCode ×]  [+]
  ↑ aktif renk                                              ↑ yeni terminal
  pulse dot = working
```

#### Status Bar (bottom of terminal)
```
[◉ claude] [~\Desktop\vibezone-v2-fresh] [● working] [git: main +2]  [CPU 34%]
```

#### Kısayollar
- `Ctrl+T` → Yeni terminal tab
- `Ctrl+W` → Tab kapat
- `Ctrl+Tab` → Sonraki tab
- `Ctrl+Shift+Tab` → Önceki tab
- `Ctrl+L` → Clear
- `Ctrl+K` → Command palette

#### Bileşenler
- `src/renderer/components/Terminal/PrimaryTerminalView.tsx` (yeni - tam ekran)
- `src/renderer/components/Terminal/CommandBlock.tsx` (yeni - komut gruplandırma)
- `src/renderer/components/Terminal/TerminalStatusBar.tsx` (yeni - alt bilgi çubuğu)
- `src/renderer/components/Terminal/TerminalPanel.tsx` (mevcut - refactor edilecek)

---

## Bölüm 3: 3D Agent Scene Sidebar

### Yaklaşım: R3F (React Three Fiber) — sıfırdan, isometric değil

### Kamera
- **Perspektif kamera**, sabit açı (~45° yukarıdan)
- **Hafif otomatik yalpı** (sinüs ile ±2° X rotasyonu)
- Kullanıcı interaksiyonu YOK (rotate/zoom yok)
- Kamera: `position={[0, 4, 6]}` `fov={50}` `lookAt={[0, 0, 0]}`

### Platform
- Altıgen (hex) platform, radius ~2.5
- Kenar glow efekti (emissive, agent rengiyle renk değişir)
- Yüzey: yarı şeffaf siyah + hafif reflektif
- Kenar altında point light (aksan rengi)

### Masa (merkez)
- Küçük kare masa, `[0, 0.2, 0]` konumunda
- Üstünde monitör efekti (küçük emissive box)
- Aktif agent buraya oturur

### Chibi Robot Modeli (ChibiRobot.tsx — yeni)
Mevcut ProceduralRobot'tan türeyen ama daha "chibi" oranlar:
```
Kafa/Vücut oranı: 1:1.2 (büyük kafa = chibi)
Kafanın 40%'ı visor (araç rengi)
Kol/bacak: kısa ve dolgun
Boyut: ~1.5 birim yükseklik
```

#### Araç → Robot Renk Eşlemesi
| Araç | Renk | Visor |
|------|------|-------|
| claude | #8b5cf6 (mor) | Mor glow |
| codex | #10b981 (yeşil) | Yeşil glow |
| opencode | #06b6d4 (cyan) | Cyan glow |
| shell | #00ff88 | Yeşil glow |
| clawbot | #f59e0b | Amber glow |
| custom | #ff6b6b | Kırmızı glow |
| team-lead | #eab308 | Altın glow |
| designer | #ec4899 | Pembe glow |
| frontend | #3b82f6 | Mavi glow |
| backend | #f97316 | Turuncu glow |
| qa | #22c55e | Yeşil glow |
| devops | #a855f7 | Mor glow |

#### PC Renk Kodlaması (DetectedAgent için)
| PC | Renk | Platform kenar rengi |
|----|------|---------------------|
| pc1 (Master) | #00ccff (cyan) | Cyan |
| pc2 (Skynet) | #f59e0b (amber) | Amber |
| vps | #00ff88 (green) | Yeşil |

#### Animasyon Durumları
- **working**: Masa başında otur, kafa sallama (bob), kol titreşim, emissive pulse hızlı
- **idle**: Platform kenarında dur, hafif float (0.05 birim yukarı-aşağı), emissive dim
- **waiting**: Platform ortasında, breathe scale (1.0 → 1.02), yavaş emissive
- **offline**: Köşede, dim (opacity 0.3), glow yok

#### Çoklu PC Agentların Görselleştirilmesi
- `detectedAgents` map'ten tüm PC'lerdeki canlı processler çekilir
- Her agent için robot spawn olur
- Robot'un altında küçük PC badge: "PC2" / "VPS" etiketi
- Platform edge rengi dominant PC'ye göre değişir (en çok agenti olan PC)

### Spawn/Despawn Animasyonu
- Spawn: `scale 0 → 1`, `y: -2 → 0`, Framer Motion ile
- Despawn: `scale 1 → 0`, `opacity 1 → 0`, eriyor gibi

### Boş Sahne
Platform var ama hiç robot yok:
```
"Ajan Bekleniyor"
Terminal'den bir araç açın
```

### Bileşenler
- `src/renderer/components/AgentScene/AgentSceneSidebar.tsx` (yeni - wrapper)
- `src/renderer/components/AgentScene/CompactScene.tsx` (yeni - R3F Canvas)
- `src/renderer/components/AgentScene/ChibiRobot.tsx` (yeni - chibi model)
- `src/renderer/components/AgentScene/ScenePlatform.tsx` (yeni - hex platform)
- `src/renderer/components/AgentScene/SceneAgentLabel.tsx` (yeni - isim chip)
- `src/renderer/components/AgentScene/SceneEffects.tsx` (yeni - bloom, fog)

### SİLİNECEK Dosyalar
```
src/renderer/components/CyberScene/CyberScene.tsx        ← isometric canvas 2D
src/renderer/components/CyberScene/isoUtils.ts           ← isometric utils
src/renderer/components/CyberScene/DataColumns.tsx       ← isometric data cols
src/renderer/components/CyberScene/Platform.tsx          ← isometric platform
src/renderer/components/CyberScene/CommandRing.tsx       ← isometric ring
src/renderer/components/CyberScene/WorkingEffects.tsx    ← isometric effects
src/renderer/components/Nodes/IsometricNodesScene.tsx    ← isometric nodes
```

### KORUNACAK ve Adapte Edilecek
```
src/renderer/components/CyberScene/RobotAgent.tsx        → ChibiRobot.tsx base
src/renderer/components/CyberScene/PostEffects.tsx       → SceneEffects.tsx base
src/renderer/components/CyberScene/AmbientParticles.tsx  → SceneEffects.tsx
src/renderer/components/CyberScene/AgentOrb.tsx          → refactor
```

---

## Bölüm 4: Task Queue (Görev Dağıtım Kuyruğu)

### Mevcut TaskBoard: Kanban (4 sütun drag-drop)
### Yeni: İkili mod — Kanban + Queue

#### Queue Modu (yeni QueueView.tsx)
```
┌─────────────────────────────────────────────────┐
│  GÖREV KUYRUĞU  [Kanban] [Kuyruk] (+Görev)      │
├─────────────────────────────────────────────────┤
│  #1  ● Yapılıyor  [Claude ●]  API endpoint yaz  │
│      └── pc1 ● working  [Geri Al] [Tamamla]     │
├─────────────────────────────────────────────────┤
│  #2  ○ Sırada     [Shell]    Unit testleri çalıştır│
│                              [Ata ↓] [Sil]      │
├─────────────────────────────────────────────────┤
│  #3  ○ Sırada     [?]        DB migration       │
│                              [Ata ↓] [Sil]      │
├─────────────────────────────────────────────────┤
│  + Görev Ekle                                   │
└─────────────────────────────────────────────────┘
```

#### Özellikler
- Sıra numarası (drag-to-reorder)
- Atanan agent chip (renk kodlu)
- PC badge (pc1/pc2/vps)
- Working/queued/done durumu
- "Sonraki ajanı ata" butonu

#### Bileşenler
- `src/renderer/components/TaskBoard/QueueView.tsx` (yeni)
- `src/renderer/components/TaskBoard/TaskBoard.tsx` → tab toggle eklenir

---

## Bölüm 5: PC Health Dashboard (Altyapı)

### Mevcut: DashboardView sadece agent/task stats gösteriyor
### Yeni: PC sağlık kartları ekleniyor

#### PC Health Card
```
┌──────────────────────────────┐
│  ◉ PC1 - Master              │ ← renk: cyan
│  Windows 11 | online         │
├──────────────────────────────┤
│  RAM  ████████░░  78%        │
│  Disk ████░░░░░░  42%        │
│  Up   2d 14h 23m             │
├──────────────────────────────┤
│  Agents: [claude] [shell]    │ ← detected processes
│  GoodGuys: active 3 tasks    │
└──────────────────────────────┘
```

#### 3 Kart: PC1 | PC2 | VPS (yan yana)
- NodeStatus'tan RAM, disk, uptime çekilir
- detectedAgents'tan aktif process gösterilir
- Bağlantı durumu (online/offline/connecting)
- GGAgentStatus: active_tasks, last_dispatch

#### Bileşenler
- `src/renderer/components/Dashboard/PCHealthCard.tsx` (yeni)
- `src/renderer/components/Dashboard/PCHealthRow.tsx` (yeni - 3 card wrapper)
- `src/renderer/components/Dashboard/DashboardView.tsx` (mevcut - PCHealthRow eklenir)

---

## Bölüm 6: Silinecek / Değiştirilecek Dosyalar Listesi

### SİL
| Dosya | Sebep |
|-------|-------|
| CyberScene/CyberScene.tsx | İsometric canvas 2D |
| CyberScene/isoUtils.ts | İsometric yardımcılar |
| CyberScene/DataColumns.tsx | İsometric |
| CyberScene/Platform.tsx | İsometric |
| CyberScene/CommandRing.tsx | İsometric |
| CyberScene/WorkingEffects.tsx | İsometric |
| Nodes/IsometricNodesScene.tsx | İsometric |

### DEĞİŞTİR
| Dosya | Değişiklik |
|-------|-----------|
| App.tsx | Grid layout 3-col, "office" tab → "terminal" tab, sağ sidebar ekle |
| renderer/hooks/useSessionStore.ts | agentSceneSidebarOpen state ekle |
| components/Terminal/TerminalPanel.tsx | PrimaryTerminalView refactor |
| components/Dashboard/DashboardView.tsx | PCHealthRow ekle |
| components/TaskBoard/TaskBoard.tsx | QueueView toggle ekle |
| shared/types.ts | Minor: tasksQueue type |

### OLUŞTUR
| Dosya | Açıklama |
|-------|----------|
| AgentScene/AgentSceneSidebar.tsx | Sağ sidebar wrapper |
| AgentScene/CompactScene.tsx | R3F Canvas |
| AgentScene/ChibiRobot.tsx | Chibi robot model |
| AgentScene/ScenePlatform.tsx | Hex platform |
| AgentScene/SceneAgentLabel.tsx | İsim etiket |
| AgentScene/SceneEffects.tsx | Bloom + fog |
| Terminal/PrimaryTerminalView.tsx | Warp-like tam ekran |
| Terminal/CommandBlock.tsx | Komut blokları |
| Terminal/TerminalStatusBar.tsx | Alt bilgi çubuğu |
| Dashboard/PCHealthCard.tsx | PC sağlık kartı |
| Dashboard/PCHealthRow.tsx | 3 kart wrapper |
| TaskBoard/QueueView.tsx | Görev kuyruğu |

---

## Bölüm 7: Renk Sistemi (Mevcut korunuyor, + eklemeler)

```css
/* Mevcut - korunuyor */
--vz-bg:        #0a0a1a
--vz-surface:   #0f0f20
--vz-surface-2: #141428
--vz-cyan:      #00ccff
--vz-purple:    #8b5cf6
--vz-green:     #00ff88
--vz-amber:     #f59e0b
--vz-text:      #e8e8f0
--vz-muted:     #5a5a78

/* Yeni eklemeler */
--vz-terminal-bg:      #080810  /* terminal için daha koyu */
--vz-command-block:    #0d0d1e  /* command block bg */
--vz-command-success:  rgba(0,255,136,0.08)
--vz-command-error:    rgba(255,68,68,0.08)
--vz-scene-bg:         #06060f  /* 3D scene bg */
```

---

## Bölüm 8: İmplementasyon Fazları

### Faz 1 — Layout + İsometric Temizlik (M)
**Hedef:** Uygulama açılabilir, isometric kod tamamen gitti
- App.tsx grid 3 sütun yapısına geçiş
- "Sahne" tab → "Terminal" tab
- CyberScene ve isometric dosyalar silindi
- Sağ sidebar placeholder (beyaz div)
- Mevcut terminal bottom'dan full-view'a taşındı

### Faz 2 — 3D Agent Scene (L)
**Hedef:** Sağ sidebar çalışır, chibi robotlar görünür
- AgentSceneSidebar + CompactScene
- ChibiRobot.tsx (çalışma animasyonları dahil)
- ScenePlatform (hex, glow)
- Session store'dan robot spawn/despawn
- Multi-PC agent görselleştirme (DetectedAgent'dan)
- Spawn/despawn animasyonları

### Faz 3 — Terminal UX (M)
**Hedef:** Warp benzeri terminal deneyimi
- PrimaryTerminalView.tsx (tam ekran, tab yönetimi)
- Command block görselleştirme
- TerminalStatusBar (cwd, status, git)
- Gelişmiş keyboard shortcuts
- Sekme sürükle-bırak ve renk kodlama

### Faz 4 — Task Queue (S)
**Hedef:** Görevleri kuyruğa alıp agentlara dağıt
- QueueView.tsx (linear liste modu)
- Kanban/Queue toggle
- Ata + PC badge + sıra numarası

### Faz 5 — PC Health Dashboard (S)
**Hedef:** 3 PC'nin sağlığı tek bakışta
- PCHealthCard.tsx
- RAM/disk/uptime gösterimi
- Detected agents listesi
- GoodGuys durumu

### Faz 6 — Stabilizasyon (S)
**Hedef:** Günlük kullanıma hazır
- TypeScript hatası sıfır
- Performance optimizasyonu (memo, lazy)
- Onboarding tooltip güncelleme
- Build test (electron-builder)

---

## Bölüm 9: Dosya Yapısı (son hali)

```
src/renderer/components/
├── AgentScene/           ← YENİ
│   ├── AgentSceneSidebar.tsx
│   ├── CompactScene.tsx
│   ├── ChibiRobot.tsx
│   ├── ScenePlatform.tsx
│   ├── SceneAgentLabel.tsx
│   └── SceneEffects.tsx
├── CyberScene/           ← SADECE KORUNACAKLAR
│   ├── AgentOrb.tsx      (refactor)
│   ├── AgentOrbs.tsx     (refactor)
│   ├── PostEffects.tsx   (taşınacak)
│   ├── AmbientParticles.tsx
│   ├── RobotAgent.tsx    (base olarak kullanılacak)
│   └── RobotAgents.tsx
├── Dashboard/
│   ├── DashboardView.tsx (güncellendi)
│   ├── PCHealthCard.tsx  ← YENİ
│   ├── PCHealthRow.tsx   ← YENİ
│   ├── AgentTable.tsx
│   └── SprintCard.tsx
├── Terminal/
│   ├── PrimaryTerminalView.tsx ← YENİ
│   ├── CommandBlock.tsx        ← YENİ
│   ├── TerminalStatusBar.tsx   ← YENİ
│   ├── TerminalPanel.tsx       (korunuyor, refactor)
│   └── TerminalManager.ts      (değişmedi)
├── TaskBoard/
│   ├── TaskBoard.tsx     (güncellendi)
│   ├── QueueView.tsx     ← YENİ
│   ├── TaskColumn.tsx
│   ├── TaskCard.tsx
│   └── ActivityFeed.tsx
└── Layout/
    ├── Sidebar.tsx       (korunuyor)
    └── TopBar.tsx        (küçük güncelleme)
```

---

## Notlar
- xterm.js altyapısı değişmiyor (SessionManager, TerminalManager korunuyor)
- ProcessWatcherManager zaten tüm PC'leri izliyor — sadece renderer'a bağlamak gerekiyor
- NodeMonitorManager sağlık verilerini zaten çekiyor — PCHealthCard buna bağlanacak
- Three.js/R3F paketi zaten var, ek paket gerekmez
- `AgentScene/` klasörü tamamen yeni; `CyberScene/` R3F dosyaları buraya taşınır
