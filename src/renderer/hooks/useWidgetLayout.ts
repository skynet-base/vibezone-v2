import { useState, useCallback, useEffect } from 'react';

export interface WidgetState {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
}

export type LayoutMap = Record<string, WidgetState>;

const DEFAULT_LAYOUTS: Record<string, WidgetState[]> = {
  dashboard: [
    { id: 'sprint',     x: 0,   y: 0,   w: 380, h: 220, minimized: false, maximized: false },
    { id: 'agents',     x: 400, y: 0,   w: 340, h: 220, minimized: false, maximized: false },
    { id: 'tasks',      x: 760, y: 0,   w: 340, h: 220, minimized: false, maximized: false },
    { id: 'agentTable', x: 0,   y: 240, w: 1100, h: 320, minimized: false, maximized: false },
    { id: 'activities', x: 0,   y: 580, w: 1100, h: 300, minimized: false, maximized: false },
  ],
  nodes: [
    { id: 'nodeCards',    x: 0,   y: 0,   w: 1100, h: 420, minimized: false, maximized: false },
    { id: 'quickActions', x: 0,   y: 440, w: 1100, h: 260, minimized: false, maximized: false },
  ],
  tasks: [
    { id: 'kanban',   x: 0, y: 0, w: 900, h: 600, minimized: false, maximized: false },
    { id: 'activity', x: 920, y: 0, w: 280, h: 600, minimized: false, maximized: false },
  ],
};

function arrayToMap(widgets: WidgetState[]): LayoutMap {
  const map: LayoutMap = {};
  for (const w of widgets) {
    map[w.id] = w;
  }
  return map;
}

function loadLayout(key: string): LayoutMap | null {
  try {
    const raw = localStorage.getItem(`vz-layout-${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutMap;
    return parsed;
  } catch {
    return null;
  }
}

function saveLayout(key: string, layout: LayoutMap): void {
  try {
    localStorage.setItem(`vz-layout-${key}`, JSON.stringify(layout));
  } catch {
    // localStorage may not be available — ignore silently
  }
}

export function useWidgetLayout(layoutKey: string) {
  const [layout, setLayout] = useState<LayoutMap>(() => {
    const stored = loadLayout(layoutKey);
    if (stored) return stored;
    const defaults = DEFAULT_LAYOUTS[layoutKey] ?? [];
    return arrayToMap(defaults);
  });

  // Persist on every change
  useEffect(() => {
    saveLayout(layoutKey, layout);
  }, [layoutKey, layout]);

  const updateWidget = useCallback((id: string, patch: Partial<WidgetState>) => {
    setLayout((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, id },
    }));
  }, []);

  const resetLayout = useCallback(() => {
    const defaults = DEFAULT_LAYOUTS[layoutKey] ?? [];
    const fresh = arrayToMap(defaults);
    setLayout(fresh);
    saveLayout(layoutKey, fresh);
  }, [layoutKey]);

  return { layout, updateWidget, resetLayout };
}
