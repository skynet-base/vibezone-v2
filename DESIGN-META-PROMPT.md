# VibeZone v2 — Design Meta-Prompt

> Bu dosya, VibeZone v2 projesinde herhangi bir AI ajanının tasarım kararlarını uygulaması için
> kullanacağı canonical design language ve implementation kılavuzudur.
> Her yeni component veya feature eklemeden önce bu dosyayı referans al.

---

## 1. VISUAL IDENTITY

**Aesthetic:** Cinematic cyberpunk AI command center — karanlık, neon aydınlatmalı, cam gibi yüzeyler,
üç boyutlu varlık hissi. Referans: Warp Terminal × Linear × Blade Runner 2049 HUD.

**Duygu:** Güçlü, hassas, canlı. Kullanıcı bu arayüzü kullandığında geleceği kontrol ettiğini hissetmeli.

**Karşı Örnek:** Flat, pastel, beyaz arka plan, emoji-heavy, "dashboard template" görünümü.

---

## 2. DESIGN TOKENS — SINGLE SOURCE OF TRUTH

Tüm renk değerlerini CSS custom properties'ten kullan. Asla hardcode etme.

### Renk Paleti
```
Arka Plan Katmanları:
  --vz-bg:          #020205   (en derin — page background)
  --vz-bg-elevated: #05050A   (elevated bg)
  --vz-surface:     #0A0A14   (glass surface base)
  --vz-surface-2:   #0F0F1A   (secondary surface)

Sınırlar:
  --vz-border:      #141428   (default border)
  --vz-border-glow: #2A2A50   (glowing border)

Metin:
  --vz-text:        #F0F0F8   (primary text)
  --vz-text-secondary: #A0A0C0 (secondary text)
  --vz-muted:       #4A4A68   (muted / placeholder)

Neon Renkler (CANONICAL — başka hex KULLANMA):
  --vz-cyan:   #00F0FF   (primary accent — data, aktif, connected)
  --vz-green:  #00FFAA   (success, online, complete)
  --vz-purple: #B200FF   (AI, magic, secondary accent)
  --vz-amber:  #FFB800   (warning, pending, caution)
  --vz-red:    #FF2A2A   (error, danger, offline)
  --vz-pink:   #FF0055   (highlight, special state)
```

### Three.js / R3F Renk Kullanımı
CSS custom properties R3F'te direkt çalışmaz. Three.js renklerini bu değerlerle tanımla:
```typescript
const COLORS = {
  cyan:   '#00F0FF',
  green:  '#00FFAA',
  purple: '#B200FF',
  amber:  '#FFB800',
  red:    '#FF2A2A',
  pink:   '#FF0055',
} as const;
```

---

## 3. TYPOGRAPHY SYSTEM

```
Font Stack:
  display: 'Space Grotesk' — başlıklar, logo, tab labels, stat numbers
  sans:    'Inter'          — body text, açıklamalar, input değerleri
  mono:    'JetBrains Mono' — kod, path, timestamp, terminal

Type Scale (kullanılacak sınıflar):
  Logo:           font-display text-xl font-bold tracking-widest
  Section Title:  font-display text-xs font-semibold uppercase tracking-wider text-vz-muted
  Card Heading:   font-display text-sm font-semibold text-vz-text
  Body:           text-sm text-vz-text-secondary
  Caption:        text-xs text-vz-muted
  Micro:          text-[10px] font-mono text-vz-muted   (sadece timestamp, path için)
  Stat Number:    font-display text-3xl font-bold (+ neon text-shadow)
```

---

## 4. GLASSMORPHISM SYSTEM

### Üç Katman (hiyerarşiye göre seç)
```css
glass-1 / glass-card: sidebar içi kartlar, list items
  bg: rgba(6, 6, 14, 0.85), blur(20px)

glass-2: ana panel container'ları (sidebar, main, terminal bento cells)
  bg: rgba(8, 8, 16, 0.88), blur(24px)

glass-3: modals, overlays (en üst katman)
  bg: rgba(4, 4, 10, 0.92), blur(30px), purple tint border
```

### Katman Derinlik Kuralı
Her glass panel'in üst kenarı `border-top: 1px solid rgba(255,255,255,0.08)` ile aydınlatılmalı.
Bu tek satır gerçekçi cam derinliği hissini yaratır.

### Gelişmiş Glass Efektleri
- `glass-prism` class'ı ekle → 8 saniyede bir prismatik shimmer geçişi
- `scanline-overlay` → ince 4px tarama çizgileri (subtle, %3 opacity)
- `hud-corners` → siyan köşe braketleri (cyberpunk HUD dili)

---

## 5. NEON GLOW SYSTEM

### Border Glow Classes
```
neon-border-cyan    — aktif tab, seçili state, connected
neon-border-green   — success, online
neon-border-purple  — modal, special
neon-border-pink    — alert, highlight
neon-border-amber   — warning
```

### Hover Amplification Kuralı
Hover state'te glow `box-shadow` değerleri 1.5-2x artmalı (class'larda tanımlı).
Transition: `transition: box-shadow 0.3s ease`

### Neon Text Shadow (stat numbers için)
```css
text-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
```

---

## 6. ANIMATION SYSTEM

### Spring Config Presets (`lib/animations.ts`'ten import et)
```typescript
springConfig.gentle  — { damping: 25, stiffness: 200 }  panel açılış, sidebar
springConfig.snappy  — { damping: 22, stiffness: 300 }  button click, tab switch
springConfig.bouncy  — { damping: 15, stiffness: 350 }  notification, badge
```

### Motion Variants (import et, tekrar yazma)
```typescript
import { fadeUp, staggerContainer, modalVariants, scaleIn, slideFromRight } from '@/lib/animations';
```

### Animasyon Kuralları
1. List items: `staggerContainer` + `fadeUp` kombinasyonu
2. Modal açılış: `modalVariants` (scale 0.95→1, spring damping=22)
3. Yeni element appear: `scaleIn` (scale 0.9→1)
4. Panel slide-in: `slideFromRight`
5. Sayılar değişince: `AnimatedNumber` component (DashboardView'dan kopyala)
6. Tab active indicator: `motion.div layoutId="activeTab"` (App.tsx pattern'ini kopyala)
7. **AnimatePresence**: conditional render olan HER şey `<AnimatePresence>` içinde olmalı

### Mikro-animasyon Kuralları
- Hover: `whileHover={{ y: -2, scale: 1.02 }}` — cards
- Tap: `whileTap={{ scale: 0.97 }}` — buttons
- Sidebar item hover: `x: 2` kayma
- Status dot pulse: `animate={{ opacity: [1, 0.4, 1] }}` 2s repeat

---

## 7. 3D SCENE DESIGN LANGUAGE

### Işık Sistemi (CyberScene)
```
ambientLight:  intensity 0.3 (genel aydınlatma, renksiz)
pointLight 1:  position [5,5,5]   color #00F0FF  intensity 0.4  (cyan key light)
pointLight 2:  position [-5,3,-5] color #B200FF  intensity 0.3  (purple fill light)
pointLight 3:  position [0,6,0]   color #ffffff  intensity 0.2  (overhead white)
Environment:   preset="night"                                    (HDR reflections)
fog:           color '#050508', near 12, far 28
```

### Materyal Hiyerarşisi
```
MeshPhysicalMaterial  — Agent orb core (metalness, roughness, emissive)
ShaderMaterial        — Fresnel rim glow, grid floor, özel efektler
MeshBasicMaterial     — Glow shells, energy lines (AdditiveBlending)
MeshStandardMaterial  — Device models, secondary objects
```

### Fresnel Rim Glow Şablonu
Agent orb gibi küresel nesnelere mutlaka Fresnel rim shader ekle:
```glsl
// Fragment shader
float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);
gl_FragColor = vec4(uColor, fresnel * uIntensity);
```
`side: THREE.BackSide` + `transparent: true` + `depthWrite: false`

### Post-Processing Kalite Seviyeleri
```
low:    hiçbir efekt
medium: Bloom(0.5, 0.8) + ChromaticAberration(0.0003) + Vignette(0.2, 0.6)
high:   Bloom(0.5, 1.5, levels=8) + ChromaticAberration + Vignette(0.1, 0.8) + Noise(0.02) + DepthOfField
```

### Kamera
```
position: [0, 5, 7], fov: 45
Intro animation: [0, 8, 14] → [0, 5, 7], 2.5s easeOutCubic
Mouse parallax: LERP_FACTOR 0.03, OFFSET_RANGE 0.3
OrbitControls: enablePan=false, zoom 5-20, dampingFactor 0.08
```

### Particle System Kuralları
- Minimum 50 particle (işlem durumlarında)
- `vertexColors: true` → her particle farklı renk
- CPU'da her frame pozisyon güncelleme: Float32Array ile `attributes.position.needsUpdate = true`
- Yükselen + dairesel spiral hareket
- Renk: agent rengi + beyaz alternating

---

## 8. COMPONENT DESIGN PATTERNS

### Yeni Component Checklist
```
□ Tüm state'leri tanımla (default, hover, active, disabled, loading, empty, error)
□ AnimatePresence ile mount/unmount animasyonu
□ Framer Motion spring'leri preset'ten kullan
□ CSS token kullan, hardcode etme
□ Keyboard accessible (tabIndex, onKeyDown)
□ focus-visible stili (ring-2 ring-vz-cyan/40)
□ Empty state için açıklayıcı text + icon
□ Loading state için skeleton veya spinner
```

### Modal Pattern
```tsx
<AnimatePresence>
  {open && (
    <div className="modal-overlay">
      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                  className="modal-content neon-border-purple">
        {/* İçerik */}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

### Card Pattern
```tsx
<motion.div
  whileHover={{ y: -2 }}
  className="glass-1 rounded-xl p-4 neon-border-cyan cursor-pointer glass-prism"
>
```

### Sidebar Item Pattern
```tsx
<motion.button
  whileHover={{ x: 2 }}
  whileTap={{ scale: 0.97 }}
  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
    ${active ? 'bg-vz-cyan/10 text-vz-cyan neon-border-cyan' : 'text-vz-muted hover:text-vz-text'}`}
>
```

---

## 9. HUD LANGUAGE (Cyberpunk UI Dili)

VibeZone'un UI'ı bir **AI komuta merkezi** gibi görünmeli. Bu elementler bunu sağlar:

### Köşe Braketleri
`hud-corners` class → cyan köşe braketleri. Ana panellere, önemli kartlara ekle.

### Tarama Çizgileri
`scanline-overlay` class → %3 opacity CRT tarama çizgileri. Glass panellere ekle.

### Logo Glitch
`glitch` class + `data-text={logoText}` → hover'da siyan/mor glitch kayması.

### Neon Kenar Işıkları
Active sidebar: `sidebar-glow` class (CSS var ile dinamik renk).

### Status Göstergesi Dili
```
● cyan pulse   — aktif / çalışıyor
● green solid  — tamamlandı / bağlı
● amber pulse  — bekliyor / uyarı
● red solid    — hata / offline
● gray dim     — idle / pasif
```

---

## 10. LAYOUT SYSTEM

### Bento Grid Ana Yapı
```
gridTemplateColumns: `${sidebarWidth}px 1fr`
gridTemplateRows:    `1fr ${terminalHeight}px` (terminal açıkken)
gap: 1rem (16px)
padding: 1rem
transition: grid-template-columns 0.3s ease
```

### Responsive Breakpoints (Electron)
```
< 900px:  sidebar auto-collapse (60px icon-only mode)
< 1200px: dashboard 2-column grid
≥ 1200px: dashboard 3-column grid
```

### Z-Index Katmanları
```
0:   3D canvas (background)
10:  glass panels content
20:  tab bar, sidebar sections
50:  tooltips, dropdowns
100: modals overlay
200: command palette
300: toast notifications
```

---

## 11. MICROCOPY GUIDELINES

**Dil:** Türkçe — kısa, net, profesyonel. Teknik terimler İngilizce kalabilir.

**Empty State Formülü:** `[Ne yok] + [Nasıl ekleyebilirsin]`
- ✅ "Agent yok. Yeni ajan eklemek için + butonuna tıklayın."
- ❌ "No agents found."

**Error State Formülü:** `[Ne oldu] + [Kullanıcı ne yapmalı]`
- ✅ "SSH bağlantısı kurulamadı. Host ayarlarını kontrol edin."
- ❌ "Connection failed."

**Loading State:** Fiil + "..." formatı
- "Yükleniyor...", "Bağlanıyor...", "Ekleniyor..."

---

## 12. PERFORMANCE KURALLAR

### 3D Scene
- `dpr={[1, 1.5]}` — 4K'da pixel ratio kısıtla
- `dispose={null}` → orb'lar sahneye kalıcı ekleniyorsa geometry'yi dispose etme
- `useFrame` içinde obje yaratma — `new THREE.Vector3()` yerine ref kullan
- Heavy components: `Suspense` + `lazy()` ile lazy load

### React Renderer
- `useSessionStore((s) => s.specificField)` — tüm store'u subscribe etme, sadece lazım olanı
- Liste render'ı: `key` prop'u stable ID ile (index değil)
- `AnimatePresence` ile unmount: component gerçekten DOM'dan kalkıyor, memory leak yok

---

## 13. ÖNCELİK SIRASI — Yeni Feature Eklerken

1. **Token check:** Renk CSS custom property mi kullanıyor?
2. **Motion check:** AnimatePresence / spring preset var mı?
3. **State check:** Loading, empty, error durumları var mı?
4. **Glass check:** Doğru glass katmanı seçildi mi?
5. **HUD check:** hud-corners veya scanline eklenmeli mi?
6. **3D check:** Yeni 3D element Fresnel + AdditiveBlending kullanıyor mu?
7. **TS check:** `npx tsc --noEmit` — 0 hata
8. **Build check:** `npm run build` — 0 hata

---

*Bu meta-prompt VibeZone v2 için bir yaşayan döküman. Yeni pattern'ler keşfedildiğinde güncellenmelidir.*
