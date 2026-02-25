import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingTooltipProps {
  id: string;
  children: React.ReactNode;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const STORAGE_KEY = 'vz-onboard-';

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  id,
  children,
  message,
  position = 'bottom',
  delay = 1000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storageKey = STORAGE_KEY + id;
    const hasSeen = localStorage.getItem(storageKey);
    if (hasSeen === '1') return;

    const timer = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setCoords({ x: rect.left, y: rect.top });
        setDimensions({ width: rect.width, height: rect.height });
        setIsVisible(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [id, delay]);

  useEffect(() => {
    if (!isVisible) return;

    const autoDismissTimer = setTimeout(() => {
      dismiss();
    }, 10000);

    return () => clearTimeout(autoDismissTimer);
  }, [isVisible]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY + id, '1');
    setIsVisible(false);
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const tooltipWidth = 240;
    const tooltipHeight = 60;
    const gap = 8;

    let left = 0;
    let top = 0;

    switch (position) {
      case 'top':
        left = coords.x + dimensions.width / 2 - tooltipWidth / 2;
        top = coords.y - tooltipHeight - gap;
        break;
      case 'bottom':
        left = coords.x + dimensions.width / 2 - tooltipWidth / 2;
        top = coords.y + dimensions.height + gap;
        break;
      case 'left':
        left = coords.x - tooltipWidth - gap;
        top = coords.y + dimensions.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        left = coords.x + dimensions.width + gap;
        top = coords.y + dimensions.height / 2 - tooltipHeight / 2;
        break;
    }

    if (position === 'top' || position === 'bottom') {
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10;
    }

    return {
      position: 'fixed' as const,
      left,
      top,
      width: tooltipWidth,
      zIndex: 9999,
    };
  };

  const getArrowStyle = (): React.CSSProperties => {
    const size = 6;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderLeft: size + 'px solid transparent',
      borderRight: size + 'px solid transparent',
    };

    switch (position) {
      case 'top':
        return { ...baseStyle, borderBottom: size + 'px solid rgba(15, 23, 42, 0.95)', left: '50%', transform: 'translateX(-50%)', bottom: -size };
      case 'bottom':
        return { ...baseStyle, borderTop: size + 'px solid rgba(15, 23, 42, 0.95)', left: '50%', transform: 'translateX(-50%)', top: -size };
      case 'left':
        return { ...baseStyle, borderRight: size + 'px solid rgba(15, 23, 42, 0.95)', top: '50%', transform: 'translateY(-50%)', right: -size };
      case 'right':
        return { ...baseStyle, borderLeft: size + 'px solid rgba(15, 23, 42, 0.95)', top: '50%', transform: 'translateY(-50%)', left: -size };
      default:
        return baseStyle;
    }
  };

  const getMotionProps = () => {
    switch (position) {
      case 'top':
        return { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
      case 'bottom':
        return { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } };
      case 'left':
        return { initial: { opacity: 0, x: 8 }, animate: { opacity: 1, x: 0 } };
      case 'right':
        return { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 } };
      default:
        return { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } };
    }
  };

  if (!isVisible) {
    return <div ref={ref}>{children}</div>;
  }

  return (
    <React.Fragment>
      <div ref={ref}>{children}</div>
      {createPortal(
        <AnimatePresence>
          <motion.div
            style={getTooltipStyle()}
            {...getMotionProps()}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-vz-surface-2/95 backdrop-blur-md border border-vz-cyan/30 rounded-lg shadow-lg p-3"
            onClick={dismiss}
          >
            <div style={getArrowStyle()} />
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-vz-text flex-1">{message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                className="text-vz-muted hover:text-vz-cyan text-xs flex-shrink-0 leading-none"
              >
                x
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </React.Fragment>
  );
};
