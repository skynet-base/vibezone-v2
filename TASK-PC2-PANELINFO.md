# TASK: PanelInfoButton Component

## Goal
Create a `PanelInfoButton` component — a small info icon (ⓘ) that shows a popover with panel details on click.

## Files to Create
- `src/renderer/components/UI/PanelInfoButton.tsx`

## Files to Modify
- `src/renderer/App.tsx` — add info button to main content panel header (tab bar area)
- `src/renderer/components/Terminal/TerminalPanel.tsx` — add info button to terminal tab bar
- `src/renderer/components/Layout/Sidebar.tsx` — add info button near the VIBEZONE logo area

## Component Specification

```tsx
interface PanelInfoButtonProps {
  title: string;        // Panel name (e.g., "Sahne", "Terminal", "Sidebar")
  shortcut?: string;    // Keyboard shortcut (e.g., "Ctrl+1", "Ctrl+`")
  description: string;  // Brief panel description
}
```

### Design Requirements
- **Icon**: SVG circle with "i" letter, 14x14px
- **Style**: text-vz-muted, hover:text-vz-cyan transition
- **Popover**: glass-card style (bg-vz-surface-2/90 backdrop-blur-md border border-vz-border/50 rounded-lg)
- **Popover position**: bottom-right of icon, with 8px gap
- **Close**: Click outside or press Escape
- **Animation**: Framer Motion — fadeIn + slight scale (0.95 → 1.0)

### Integration Points
1. **App.tsx tab bar** (line ~128): Add after the tab buttons, before the spacer. Show info for active view.
   - `title`: active tab's label
   - `shortcut`: "Ctrl+1" through "Ctrl+4"
   - `description`: "3D agent sahnesini goruntuleyin" etc.

2. **TerminalPanel.tsx tab bar** (line ~237): Add before the spacer div.
   - `title`: "Terminal"
   - `shortcut`: "Ctrl+`"
   - `description`: "Agent terminalleri ve komut satiri"

3. **Sidebar.tsx logo area** (line ~176): Add next to "COMMAND CENTER" text.
   - `title`: "Sidebar"
   - `shortcut`: "-"
   - `description`: "Agent listesi ve proje yonetimi"

## Tech Stack
- React 18.3 + TypeScript 5.6
- Framer Motion 11 (already installed)
- Tailwind 3.4 with custom vz- prefixed colors

## Existing Color Variables
- `vz-cyan`: #00ccff
- `vz-muted`: muted text color
- `vz-surface-2`: surface background
- `vz-border`: border color
- `glass-card`: glass effect class

## After Completion
1. Run: `npx tsc --noEmit` to verify zero TS errors
2. Git commit with message: `feat: add PanelInfoButton component with popover`
3. Push to `master` branch
