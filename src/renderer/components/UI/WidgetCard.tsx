import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { WidgetState } from '../../hooks/useWidgetLayout';

interface WidgetCardProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  widgetState: WidgetState;
  onUpdate: (patch: Partial<WidgetState>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  /** If true, the drag handle area will always be visible even when widget content is hidden */
  alwaysShowHandle?: boolean;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  id,
  title,
  icon,
  children,
  widgetState,
  onUpdate,
  containerRef,
  minWidth = 200,
  minHeight = 80,
  className = '',
  alwaysShowHandle = true,
}) => {
  const { x, y, w, h, minimized, maximized } = widgetState;

  // Track drag state via refs to avoid re-renders during mousemove
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, wx: 0, wy: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, ww: 0, wh: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Snapshot state for maximized restore
  const preMaxState = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // ─── Drag handlers ───────────────────────────────────────────────
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (maximized) return; // can't drag when maximized
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      dragStart.current = { mx: e.clientX, my: e.clientY, wx: x, wy: y };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const container = containerRef.current;
        const card = cardRef.current;
        if (!container || !card) return;

        const containerRect = container.getBoundingClientRect();
        const dx = me.clientX - dragStart.current.mx;
        const dy = me.clientY - dragStart.current.my;

        let newX = dragStart.current.wx + dx;
        let newY = dragStart.current.wy + dy;

        // Clamp within container
        const maxX = containerRect.width - w;
        const maxY = containerRect.height - (minimized ? 36 : h);
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        onUpdate({ x: newX, y: newY });
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [x, y, w, h, minimized, maximized, containerRef, onUpdate]
  );

  // ─── Resize handlers ──────────────────────────────────────────────
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (maximized || minimized) return;
      e.preventDefault();
      e.stopPropagation();
      resizing.current = true;
      resizeStart.current = { mx: e.clientX, my: e.clientY, ww: w, wh: h };

      const handleMouseMove = (me: MouseEvent) => {
        if (!resizing.current) return;
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const dx = me.clientX - resizeStart.current.mx;
        const dy = me.clientY - resizeStart.current.my;

        let newW = Math.max(minWidth, resizeStart.current.ww + dx);
        let newH = Math.max(minHeight, resizeStart.current.wh + dy);

        // Clamp to container bounds
        const maxW = containerRect.width - x;
        const maxH = containerRect.height - y;
        newW = Math.min(newW, maxW);
        newH = Math.min(newH, maxH);

        onUpdate({ w: newW, h: newH });
      };

      const handleMouseUp = () => {
        resizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [x, y, w, h, minimized, maximized, minWidth, minHeight, containerRef, onUpdate]
  );

  // ─── Minimize / Maximize ─────────────────────────────────────────
  const handleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUpdate({ minimized: !minimized, maximized: false });
    },
    [minimized, onUpdate]
  );

  const handleMaximize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (maximized) {
        // Restore from saved snapshot
        const snap = preMaxState.current;
        if (snap) {
          onUpdate({ maximized: false, x: snap.x, y: snap.y, w: snap.w, h: snap.h });
        } else {
          onUpdate({ maximized: false });
        }
      } else {
        // Save current state and maximize
        preMaxState.current = { x, y, w, h };
        onUpdate({ maximized: true, minimized: false });
      }
    },
    [maximized, x, y, w, h, onUpdate]
  );

  // ─── Compute rendered position/size ──────────────────────────────
  let renderX = x;
  let renderY = y;
  let renderW = w;
  let renderH = minimized ? 36 : h;

  if (maximized && containerRef.current) {
    renderX = 0;
    renderY = 0;
    renderW = containerRef.current.clientWidth;
    renderH = containerRef.current.clientHeight;
  }

  // Prevent text selection while dragging / resizing
  const [isInteracting, setIsInteracting] = useState(false);
  useEffect(() => {
    const onDown = () => setIsInteracting(true);
    const onUp = () => setIsInteracting(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      data-widget-id={id}
      style={{
        position: 'absolute',
        left: renderX,
        top: renderY,
        width: renderW,
        height: renderH,
        zIndex: maximized ? 50 : 10,
        userSelect: isInteracting ? 'none' : undefined,
        transition: maximized ? 'left 0.2s,top 0.2s,width 0.2s,height 0.2s' : undefined,
      }}
      className={className}
    >
      {/* Card shell */}
      <div
        className="flex flex-col h-full rounded-xl overflow-hidden"
        style={{
          background: 'rgba(5,5,10,0.85)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(0,204,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* ── Title bar / drag handle ── */}
        <div
          onMouseDown={handleDragMouseDown}
          className="flex items-center gap-2 px-3 flex-shrink-0 select-none"
          style={{
            height: 36,
            cursor: maximized ? 'default' : 'grab',
            background: 'rgba(0,204,255,0.04)',
            borderBottom: minimized ? 'none' : '1px solid rgba(0,204,255,0.08)',
          }}
        >
          {/* Icon */}
          {icon && (
            <span className="flex-shrink-0 opacity-60 text-vz-cyan">
              {icon}
            </span>
          )}

          {/* Title */}
          <span
            className="flex-1 min-w-0 truncate text-vz-cyan font-display font-semibold uppercase tracking-wider"
            style={{ fontSize: 10 }}
          >
            {title}
          </span>

          {/* Control buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Minimize */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMinimize}
              title={minimized ? 'Geri yükle' : 'Küçült'}
              className="w-5 h-5 rounded flex items-center justify-center text-vz-muted hover:text-vz-cyan hover:bg-vz-cyan/10 transition-colors"
              style={{ fontSize: 11 }}
            >
              {minimized ? (
                // Restore icon (up arrow)
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                // Minimize icon (minus)
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* Maximize / Restore */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMaximize}
              title={maximized ? 'Küçült' : 'Tam ekran'}
              className="w-5 h-5 rounded flex items-center justify-center text-vz-muted hover:text-vz-cyan hover:bg-vz-cyan/10 transition-colors"
            >
              {maximized ? (
                // Restore icon (two overlapping squares — shrink)
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="3" width="6" height="6" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H7" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              ) : (
                // Maximize icon (expand arrows)
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M1 3.5V1.5A.5.5 0 0 1 1.5 1H3.5M6.5 1H8.5A.5.5 0 0 1 9 1.5V3.5M9 6.5V8.5a.5.5 0 0 1-.5.5H6.5M3.5 9H1.5A.5.5 0 0 1 1 8.5V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Content area ── */}
        {!minimized && (
          <div className="flex-1 min-h-0 overflow-auto relative">
            {children}
          </div>
        )}
      </div>

      {/* ── Resize handle (bottom-right) ── */}
      {!minimized && !maximized && (
        <div
          onMouseDown={handleResizeMouseDown}
          title="Yeniden boyutlandır"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            cursor: 'se-resize',
            zIndex: 20,
          }}
        >
          {/* Triangle indicator */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            style={{ position: 'absolute', bottom: 3, right: 3, opacity: 0.35 }}
          >
            <path d="M10 0 L10 10 L0 10 Z" fill="rgba(0,204,255,0.8)" />
          </svg>
        </div>
      )}
    </div>
  );
};
