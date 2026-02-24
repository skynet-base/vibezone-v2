import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../../hooks/useToastStore';

const TYPE_STYLES = {
  success: { borderColor: '#00ff88', icon: '✓', iconBg: 'rgba(0,255,136,0.15)' },
  error: { borderColor: '#ff4466', icon: '!', iconBg: 'rgba(255,68,102,0.15)' },
  info: { borderColor: '#00ccff', icon: 'i', iconBg: 'rgba(0,204,255,0.15)' },
} as const;

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = TYPE_STYLES[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg min-w-[260px] max-w-[380px] backdrop-blur-md"
              style={{
                background: 'rgba(12, 12, 20, 0.85)',
                borderLeft: `3px solid ${style.borderColor}`,
                boxShadow: `0 0 20px rgba(0,0,0,0.4), 0 0 8px ${style.borderColor}20`,
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: style.iconBg, color: style.borderColor }}
              >
                {style.icon}
              </span>
              <span className="text-xs text-vz-text flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-vz-muted hover:text-vz-text transition-colors flex-shrink-0 p-0.5"
              >
                <svg width="10" height="10" viewBox="0 0 12 12">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
