import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PanelInfoButtonProps {
  title: string;
  shortcut?: string;
  description: string;
}

export const PanelInfoButton: React.FC<PanelInfoButtonProps> = ({
  title,
  shortcut,
  description,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-vz-muted hover:text-vz-cyan transition-colors duration-200 p-1"
        title="Panel Bilgisi"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <text
            x="7"
            y="9.5"
            textAnchor="middle"
            fontSize="7"
            fontWeight="600"
            fill="currentColor"
          >
            i
          </text>
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 z-50"
            style={{ marginRight: '-4px' }}
          >
            <div
              className="bg-vz-surface-2/90 backdrop-blur-md border border-vz-border/50 rounded-lg p-3 min-w-[200px] shadow-xl"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-vz-text">{title}</span>
                {shortcut && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-vz-border/30 text-vz-muted font-mono">
                    {shortcut}
                  </span>
                )}
              </div>
              <p className="text-xs text-vz-muted">{description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
