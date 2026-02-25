# TASK-PC1: Command Palette + Keyboard Shortcuts + Integration

**PC:** PC1 (Master — Claude Code)
**Hedef:** Core UX altyapısı — Command Palette, hotkey sistemi, state persistence

---

## GÖREV 1: useHotkeys Hook — Global Klavye Kısayolları

**Dosya:** `src/renderer/hooks/useHotkeys.ts` (YENİ)

### Yapılacaklar:
1. Yeni hook oluştur: `useHotkeys(shortcuts: HotkeyMap)`
2. Mevcut `useIPC.ts`'deki `keydown` handler'ı bu hook'a taşı
3. Kısayol listesi:
   - `Ctrl+K` → Command Palette aç/kapat
   - `Ctrl+W` → Aktif session'ı kapat (kill)
   - `Ctrl+B` → Sidebar toggle
   - `Ctrl+,` → Settings modal aç
   - `Ctrl+Shift+N` → SSH Host ekle modal
   - `Ctrl+N` → Yeni agent modal (zaten var)
   - `Ctrl+`` ` → Terminal toggle (zaten var)
   - `Ctrl+Shift+T` → Yeni shell (zaten var)
   - `Ctrl+1-4` → Tab geçişi (zaten var)
   - `Ctrl+Tab` / `Ctrl+Shift+Tab` → Sonraki/önceki session
   - `Ctrl+R` → Aktif session restart
   - `F11` → Fullscreen toggle
   - `?` veya `Ctrl+/` → Shortcuts cheat sheet
4. Terminal xterm focus'tayken sadece Ctrl+Shift kombinasyonlarını yakala
5. Input/textarea/select'te skip et (zaten var, koru)

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 2: Command Palette Komponenti

**Dosya:** `src/renderer/components/CommandPalette/CommandPalette.tsx` (YENİ)

### Yapılacaklar:
1. `Ctrl+K` ile açılan fuzzy search overlay:
   - Fixed pozisyon, top: 20%, center, max-width: 640px
   - Glass panel: `bg-vz-surface/95 backdrop-blur-xl border border-vz-border`
   - Input alanı üstte, sonuçlar altta (max 8 görünür)
2. Kategori grupları:
   - **Agentlar**: Mevcut session listesi (tıklayınca aktif yap)
   - **Komutlar**: "Yeni Agent", "Settings", "Terminal Aç", "Sidebar Toggle"
   - **Tablar**: Office, Tasks, Dashboard, Altyapı
   - **Kısayollar**: Her komutun yanında shortcut badge'i
3. Fuzzy search: basit `includes` filtresi yeterli
4. Klavye navigasyonu: Arrow Up/Down + Enter seçim + Escape kapat
5. `useSessionStore`'a ekle: `commandPaletteOpen: boolean`, `toggleCommandPalette()`
6. Framer Motion: `scale(0.96) → 1`, `opacity 0 → 1`, `0.15s` spring
7. Backdrop: yarı saydam siyah, tıklayınca kapat

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 3: ConfirmModal Komponenti

**Dosya:** `src/renderer/components/UI/ConfirmModal.tsx` (YENİ)

### Yapılacaklar:
1. `window.confirm()` yerine tema uyumlu modal:
   - Props: `title, message, confirmText, cancelText, variant ('danger' | 'warning' | 'info'), onConfirm, onCancel`
   - Glass panel, modal-overlay stili
   - `variant='danger'` → kırmızı confirm butonu
2. `useConfirm` hook: Promise-based API
   ```tsx
   const confirm = useConfirm();
   const ok = await confirm({ title: 'Session Kapat', message: '...', variant: 'danger' });
   ```
3. Sidebar.tsx'deki `window.confirm()` → `useConfirm()` ile değiştir
4. TaskCard.tsx'deki `window.confirm()` → `useConfirm()` ile değiştir

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 4: State Persistence

**Dosya:** `src/renderer/hooks/useSessionStore.ts`

### Yapılacaklar:
1. `sidebarCollapsed` ve `sidebarWidth`'i localStorage'a persist et
2. `activeView`'ı localStorage'a persist et
3. Zustand `persist` middleware kullan veya manual useEffect
4. Uygulama açıldığında restore et

**Test:** `npx tsc --noEmit` sıfır hata.

---

## GÖREV 5: Final Merge & QA

### Yapılacaklar:
1. PC2 ve VPS branch'lerini fetch et
2. Merge conflict çöz
3. `npx tsc --noEmit` — her iki tsconfig
4. `npm run build` — başarılı
5. `npm run dev` — test et
6. `git push origin master`
