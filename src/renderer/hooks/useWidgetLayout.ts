import { useState, useCallback } from 'react';

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
  // Dashboard: wide top row, large table (Target: 2420w x 960h)
  dashboard: [
    { id: 'sprint', x: 0, y: 0, w: 800, h: 320, minimized: false, maximized: false },
    { id: 'agents', x: 816, y: 0, w: 800, h: 320, minimized: false, maximized: false },
    { id: 'tasks', x: 1632, y: 0, w: 788, h: 320, minimized: false, maximized: false },
    { id: 'agentTable', x: 0, y: 336, w: 1616, h: 620, minimized: false, maximized: false },
    { id: 'activities', x: 1632, y: 336, w: 788, h: 620, minimized: false, maximized: false },
  ],
  // Nodes: stacked full-width widgets
  nodes: [
    { id: 'nodeCards', x: 0, y: 0, w: 2420, h: 480, minimized: false, maximized: false },
    { id: 'quickActions', x: 0, y: 496, w: 2420, h: 460, minimized: false, maximized: false },
  ],
  // Tasks: kanban takes most width, activity feed on right
  tasks: [
    { id: 'kanban', x: 0, y: 0, w: 1800, h: 960, minimized: false, maximized: false },
    { id: 'activity', x: 1816, y: 0, w: 604, h: 960, minimized: false, maximized: false },
  ],
};

function arrayToMap(widgets: WidgetState[]): LayoutMap {
  const map: LayoutMap = {};
  for (const w of widgets) {
    map[w.id] = w;
  }
  return map;
}


export function useWidgetLayout(layoutKey: string) {
  // Always start with defaults — no localStorage persistence
  const [layout, setLayout] = useState<LayoutMap>(() => {
    const defaults = DEFAULT_LAYOUTS[layoutKey] ?? [];
    return arrayToMap(defaults);
  });

  const updateWidget = useCallback((id: string, patch: Partial<WidgetState>) => {
    setLayout((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, id },
    }));
  }, []);

  const resetLayout = useCallback(() => {
    const defaults = DEFAULT_LAYOUTS[layoutKey] ?? [];
    setLayout(arrayToMap(defaults));
  }, [layoutKey]);

  return { layout, updateWidget, resetLayout };
}
