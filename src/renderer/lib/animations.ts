import type { Variants } from 'framer-motion';

export const springConfig = {
  gentle: { type: 'spring' as const, damping: 25, stiffness: 200 },
  snappy: { type: 'spring' as const, damping: 22, stiffness: 300 },
  bouncy: { type: 'spring' as const, damping: 15, stiffness: 350 },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 280 },
  },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15 } },
};

export const shimmerPulse: Variants = {
  hidden: { opacity: 0.3 },
  visible: {
    opacity: [0.3, 0.6, 0.3],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: springConfig.snappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const slideFromRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: springConfig.gentle },
  exit: { opacity: 0, x: 20, transition: { duration: 0.15 } },
};
