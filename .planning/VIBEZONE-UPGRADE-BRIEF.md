# VibeZone v2 — Kapsamlı Upgrade Görevi

## Proje: `C:\Users\TR\Desktop\vibezone-v2-fresh`
## GitHub: `github.com/skynet-base/vibezone-v2`
## Deadline: 10:00 AM TR saati

---

## GÖREV ÖZETİ

VibeZone Electron dashboard'unda 7 ana iş yapılacak:

### 1. RESIZABLE PANELS (Büyütülüp Küçültülebilir Paneller)
**BUG:** Terminal panel'de `handleResizeStart` kodu var ama App.tsx'te grid `300px` sabit — store'daki `terminalHeight` grid'e bağlı değil.

**YAPILACAK:**
- App.tsx: `gridTemplateRows` → `terminalHeight` store değerini kullan
- Sidebar: 240px sabit → drag-to-resize ekle (min 180px, max 400px), `sidebarWidth` store'a ekle
- Main panel: Otomatik `1fr` ile sidebar+terminal'e göre adapte olsun
- Her resize handle'a `cursor: col-resize` / `cursor: row-resize` ekle
- Double-click ile default boyuta dön özelliği

**UX Best Practice:**
- `react-resizable-panels` veya manual CSS grid + mouse event yaklaşımı
- VS Code tarzı splitter bar'lar (4px genişlik, hover'da highlight)
- `min-size` ve `max-size` constraint'leri
- Resize sırasında `user-select: none` ve `pointer-events: none` overlay

### 2. 3D SAHNE FIX + GELİŞTİRME (CyberScene)
**SORUNLAR:**
- Session yokken sahne bomboş — sadece grid floor + command rings görünüyor
- Kullanıcı için ilk açılışta "WOW" etkisi yok
- Scene çok karanlık, fog çok agresif

**YAPILACAK:**
- Boş sahne durumu: Merkeze büyük bir holographic "VIBEZONE" logo + parçacık efekti
- Welcome state: "Agent ekleyin" mesajı 3D Text ile
- Fog mesafesini artır (8,20 → 10,25)
- ambientLight intensity: 0.15 → 0.25
- Platform grid pulse'ı daha görünür yap
- DataColumns'ı biraz daha parlak yap (opacity 0.08 → 0.15)

### 3. KOYU CODER TONLARI (Dark Theme Refinement)
**YAPILACAK:**
- Panel arka planları: Mevcut glass → daha opak siyah tonları
- `glass-2` → `background: rgba(8, 8, 16, 0.85)` (daha koyu)
- Terminal area: Tam siyah `#0a0a0f` arka plan
- Sidebar: `rgba(6, 6, 14, 0.9)`
- Border'lar: Daha subtle, `rgba(255,255,255,0.04)`
- Kod editörü hissi: VS Code Dark+ benzeri derinlik

### 4. INFO ICON (Sağ Üst Kapatma → Info)
**YAPILACAK:**
- Her panel'in sağ üstündeki X (kapatma) butonunu → ℹ️ info ikonu ile değiştir
- Tıklanınca küçük popup/tooltip açılsın: "Bu panel ne yapıyor?" açıklaması
- Panel açıklamaları:
  - **Sahne:** "3D agent görselleştirmesi. Agent'ları küre olarak gösterir, durumlarını renklerle belirtir."
  - **Görevler:** "Kanban board. Görevleri sürükle-bırak ile yönetin."
  - **Dashboard:** "Agent istatistikleri ve sprint durumu."
  - **Altyapı:** "Multi-PC altyapı monitörü. SSH bağlantı durumları."
  - **Terminal:** "xterm.js terminal. Agent'larla doğrudan etkileşim."
  - **Sidebar:** "Agent listesi ve hızlı erişim."

### 5. EĞİTİCİ AÇIKLAMA KUTUCUKLARI (Onboarding Tooltips)
**YAPILACAK:**
- İlk açılışta her panel'de küçük bilgi kutucuğu göster
- Framer Motion ile fade-in, 5sn sonra fade-out
- "Anladım" butonu ile kapatılabilir
- `localStorage` ile "gösterildi" durumu kaydet
- Küçük, cam efektli kutular: glass-1 + neon border

### 6. TÜM BUG FIX'LER
- [ ] Terminal resize → grid'e bağla (App.tsx line 106)
- [ ] Terminal açık değilken grid alanı boş kalıyor → terminal kapalıyken grid'i `1fr` yap
- [ ] `terminalOpen === false` durumunda terminal grid alanı collapse etsin
- [ ] TypeScript strict kontrolü: `tsc --noEmit` hatasız olmalı
- [ ] PostEffects: ChromaticAberration offset deprecated uyarısı kontrol et

### 7. BUILD & DEPLOY
- `npm run build` başarılı olmalı
- `npm run typecheck` hatasız
- Git commit + push to `github.com/skynet-base/vibezone-v2`

---

## DOSYA HARİTASI

```
DÜZENLENECEK DOSYALAR:
├── src/renderer/App.tsx                    — Grid layout, resizable panels
├── src/renderer/index.css                  — Koyu tema, glass stilleri
├── src/renderer/hooks/useSessionStore.ts   — sidebarWidth state ekle
├── src/renderer/components/Layout/Sidebar.tsx   — Resize handle
├── src/renderer/components/Layout/TopBar.tsx    — Info icon
├── src/renderer/components/Terminal/TerminalPanel.tsx — Resize fix
├── src/renderer/components/CyberScene/CyberScene.tsx — Boş sahne state
├── src/renderer/components/CyberScene/PostEffects.tsx — Fix
├── tailwind.config.js                      — Yeni renk token'ları

YENİ DOSYALAR:
├── src/renderer/components/PanelInfo/PanelInfoButton.tsx  — Info icon component
├── src/renderer/components/Onboarding/OnboardingTooltip.tsx — Eğitici tooltip
```

---

## MEVCUT TECH STACK
- Electron 33.2 + React 18.3 + TypeScript 5.6 + Vite 6.0
- Three.js 0.183 + @react-three/fiber 8.18 + drei 9.122
- xterm.js 5.5 + Zustand 5.0 + Framer Motion 11 + Tailwind 3.4

## BUILD KOMUTLARI
```bash
cd /c/Users/TR/Desktop/vibezone-v2-fresh
npm run build          # main + renderer
npm run typecheck      # TS kontrol
npm run dev            # geliştirme
```
