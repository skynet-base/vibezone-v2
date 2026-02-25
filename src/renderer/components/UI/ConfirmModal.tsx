import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants } from '../../lib/animations';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig = {
  danger: {
    btn: 'bg-vz-red/20 text-vz-red hover:bg-vz-red/30 border border-vz-red/30',
    glow: 'rgba(255,42,42,0.35)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    iconColor: '#FF2A2A',
    borderColor: 'rgba(255,42,42,0.25)',
  },
  warning: {
    btn: 'bg-vz-amber/20 text-vz-amber hover:bg-vz-amber/30 border border-vz-amber/30',
    glow: 'rgba(255,184,0,0.35)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    iconColor: '#FFB800',
    borderColor: 'rgba(255,184,0,0.25)',
  },
  info: {
    btn: 'bg-vz-cyan/20 text-vz-cyan hover:bg-vz-cyan/30 border border-vz-cyan/30',
    glow: 'rgba(0,240,255,0.35)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    iconColor: '#00F0FF',
    borderColor: 'rgba(0,240,255,0.25)',
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Iptal',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const config = variantConfig[variant];

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel, onConfirm]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="modal-overlay"
          style={{ zIndex: 9999 }}
          onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-3 rounded-xl p-6 shadow-2xl no-drag"
            style={{
              minWidth: 'min(380px, calc(100vw - 32px))',
              maxWidth: 'min(440px, calc(100vw - 32px))',
              border: `1px solid ${config.borderColor}`,
              boxShadow: `0 0 32px ${config.glow}, 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)`,
            }}
          >
            {/* Icon + Title Row */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: config.iconColor + '18',
                  color: config.iconColor,
                  border: `1px solid ${config.iconColor}30`,
                }}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-base font-semibold text-vz-text leading-tight">{title}</h2>
                <p className="text-sm text-vz-text-secondary mt-1.5 leading-relaxed">{message}</p>
              </div>
            </div>

            {/* Divider */}
            <div
              className="mb-5"
              style={{
                height: 1,
                background: `linear-gradient(90deg, transparent, ${config.iconColor}20, transparent)`,
              }}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                autoFocus
                className="btn-secondary px-5 py-2 text-sm"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] ${config.btn}`}
                style={{
                  boxShadow: `0 0 12px ${config.glow}`,
                }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
