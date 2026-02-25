# TASK-PC2: Frontend Visual Polish & UX Components

**PC:** PC2 (Worker — OpenCode)
**Branch:** `fix/pc2-final-polish`
**Hedef:** Terminal close butonları, CSS polish, animasyon tutarlılığı, toast iyileştirme

---

## GÖREV 1: Terminal Tab Close Butonu

**Dosya:** `src/renderer/components/Terminal/TerminalPanel.tsx`

### Yapılacaklar:
1. Her terminal tab'ına "X" (kapat) butonu ekle:
```tsx
<button
  onClick={(e) => { e.stopPropagation(); killSession(session.id); }}
  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-vz-red transition-opacity"
  title="Terminal Kapat"
>
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
</button>
```
2. Tab item'a `group` class'ı ekle (hover reveal için)
3. Aktif tab'da X her zaman görünür, diğerlerinde hover'da

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 2: CSS Final Polish

**Dosya:** `src/renderer/index.css`

### Yapılacaklar:
1. `neon-border-amber` ekle (cyan/green/purple/pink var, amber eksik):
```css
.neon-border-amber {
  border: 1px solid rgba(255, 184, 0, 0.3);
  box-shadow: var(--neon-glow-amber);
  transition: box-shadow 0.3s ease;
}
.neon-border-amber:hover {
  box-shadow: 0 0 20px rgba(255,184,0,0.6), 0 0 40px rgba(255,184,0,0.3), inset 0 0 12px rgba(255,184,0,0.2);
}
```
2. Focus-visible stiller ekle:
```css
*:focus-visible {
  outline: 2px solid rgba(0, 240, 255, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}
button:focus-visible, [role="button"]:focus-visible {
  box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.4);
}
```
3. Reduced motion desteği:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
4. Scrollbar stili (webkit):
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
```

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 3: Animasyon Preset'leri

**Dosya:** `src/renderer/lib/animations.ts`

### Yapılacaklar:
1. Tutarlı spring config preset'leri ekle:
```typescript
export const springConfig = {
  gentle: { type: 'spring' as const, damping: 25, stiffness: 200 },
  snappy: { type: 'spring' as const, damping: 22, stiffness: 300 },
  bouncy: { type: 'spring' as const, damping: 15, stiffness: 350 },
};
```
2. Eksik variant'ları ekle:
```typescript
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: springConfig.snappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const slideFromRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: springConfig.gentle },
  exit: { opacity: 0, x: 20, transition: { duration: 0.15 } },
};
```

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 4: Toast Warning Tipi

**Dosya:** `src/renderer/components/Toast/ToastContainer.tsx`

### Yapılacaklar:
1. `warning` tipi ekle (mevcut: success, error, info):
   - Renk: amber (`text-vz-amber`, `border-l-amber-500`)
   - İkon: ⚠ (warning triangle)
2. Toast tipine göre border-left renk:
   - success → green
   - error → red
   - info → cyan
   - warning → amber
3. useToastStore'da `warning` tipini destekle

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 5: Modal AnimatePresence Fix

**Dosya:** `src/renderer/App.tsx`

### Yapılacaklar:
1. Tüm modal'ları `<AnimatePresence>` ile sar:
```tsx
<AnimatePresence>
  {createModalOpen && <CreateAgentModal ... />}
</AnimatePresence>
<AnimatePresence>
  {settingsOpen && <SettingsModal ... />}
</AnimatePresence>
<AnimatePresence>
  {sshModalOpen && <SSHHostModal ... />}
</AnimatePresence>
```
2. Her modal'da `exit` animasyonu tanımla (scale 1→0.95, opacity 1→0)
3. Modal backdrop'a da exit animasyonu ekle

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 6: İngilizce String'leri Türkçeleştir

**Dosyalar:** Tüm `src/renderer/components/` altı

### Yapılacaklar:
1. SSHHostModal: "Remove this SSH host?" → "Bu SSH host'u kaldır?"
2. SSHHostModal: "No SSH hosts configured" → "SSH host yapılandırılmamış"
3. SSHHostModal: "Add SSH Host" → "SSH Host Ekle"
4. SSHHostModal: "Cancel" → "İptal"
5. SSHHostModal: "Testing..." → "Test ediliyor..."
6. Diğer İngilizce string'leri tara ve Türkçeleştir

**Test:** `npx tsc --noEmit` sıfır hata.

---

## Commit Stratejisi
```bash
git checkout -b fix/pc2-final-polish
# Her görev için commit:
git add [dosyalar] && git commit -m "fix: [açıklama]"
# Bitince:
git push origin fix/pc2-final-polish
```
