# TASK: OnboardingTooltip Component

## Goal
Create an `OnboardingTooltip` component — contextual first-time user tooltips that appear once and are dismissed permanently.

## Files to Create
- `src/renderer/components/UI/OnboardingTooltip.tsx`

## Files to Modify
- `src/renderer/App.tsx` — add onboarding tooltips pointing to key UI elements

## Component Specification

```tsx
interface OnboardingTooltipProps {
  id: string;               // Unique key for localStorage (e.g., "onboard-sidebar")
  children: React.ReactNode; // The element to wrap/point to
  message: string;          // Tooltip text
  position?: 'top' | 'bottom' | 'left' | 'right'; // Arrow direction, default 'bottom'
  delay?: number;           // Show delay in ms, default 1000
}
```

### Design Requirements
- **localStorage key pattern**: `vz-onboard-${id}` — set to "1" when dismissed
- **Appearance**: glass-card popover (bg-vz-surface-2/95 backdrop-blur-md border border-vz-cyan/30 rounded-lg shadow-lg)
- **Arrow**: CSS triangle pointing to the target element (6px, border trick)
- **Text**: text-xs text-vz-text with a small "x" close button (text-vz-muted hover:text-vz-cyan)
- **Animation**: Framer Motion — fade in from the position direction (e.g., y: -8 for 'bottom')
- **Dismiss**: Click the X button OR click anywhere on the tooltip → sets localStorage, never shows again
- **Auto-dismiss**: After 10 seconds, auto-fade out and set localStorage

### Integration in App.tsx
Add 3 onboarding tooltips (wrap existing elements):

1. **"Agent Ekle" button area** (in Sidebar):
   - `id`: "add-agent"
   - `message`: "Yeni bir AI asistan veya terminal baslatmak icin tiklayin"
   - `position`: "right"

2. **Tab bar** (in main content):
   - `id`: "tab-bar"
   - `message`: "Farkli gorunumler arasinda gecis yapin: Sahne, Gorevler, Dashboard, Altyapi"
   - `position`: "bottom"

3. **Terminal area** (when terminal opens):
   - `id`: "terminal"
   - `message`: "Terminal acmak icin Ctrl+Shift+T, kapamak icin Ctrl+` kullanin"
   - `position`: "top"

### Important Notes
- Only show tooltips when `localStorage.getItem('vz-onboard-${id}')` is NOT "1"
- Show tooltips with staggered delays: first at 1000ms, second at 3000ms, third at 5000ms
- On dismiss, remove from DOM (not just hide)
- Use React Portal (createPortal) for positioning to avoid overflow:hidden issues
- Calculate position relative to the wrapped children element using useRef + getBoundingClientRect

## Tech Stack
- React 18.3 + TypeScript 5.6
- Framer Motion 11 (already installed)
- Tailwind 3.4 with custom vz- prefixed colors

## After Completion
1. Run: `npx tsc --noEmit` to verify zero TS errors
2. Git commit with message: `feat: add OnboardingTooltip for first-time user guidance`
3. Push to `master` branch
