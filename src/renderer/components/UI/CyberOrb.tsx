import React from 'react';
import { motion } from 'framer-motion';

interface CyberOrbProps {
    color: string;
    size?: number;
    pulsing?: boolean;
    label?: string;
    subLabel?: string;
    onClick?: () => void;
}

export const CyberOrb: React.FC<CyberOrbProps> = ({
    color,
    size = 120,
    pulsing = true,
    label,
    subLabel,
    onClick,
}) => {
    return (
        <div className="flex flex-col items-center justify-center relative cursor-pointer group" onClick={onClick}>
            {/* Outer Pulse */}
            {pulsing && (
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute rounded-full blur-2xl pointer-events-none"
                    style={{
                        width: size * 1.8,
                        height: size * 1.8,
                        backgroundColor: color,
                    }}
                />
            )}

            {/* Core Orb */}
            <motion.div
                whileHover={{ scale: 1.1 }}
                animate={{
                    y: [-5, 5, -5]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="relative rounded-full border-2 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden"
                style={{
                    width: size,
                    height: size,
                    background: `radial-gradient(circle at 30% 30%, ${color} 0%, rgba(10,10,20,0.9) 70%)`,
                    boxShadow: `0 0 ${size / 2}px ${color}66, inset 0 0 ${size / 4}px ${color}AA`,
                }}
            >
                {/* Inner Glare / Reflection */}
                <div className="absolute top-1 left-2 w-1/2 h-1/4 bg-white/30 rounded-full blur-[2px] rotate-[-20deg]" />

                {/* Optional small inner core */}
                <div className="w-1/3 h-1/3 rounded-full blur-md" style={{ backgroundColor: color }} />
            </motion.div>

            {/* Holographic Labels */}
            {label && (
                <motion.div
                    className="absolute -bottom-10 flex flex-col items-center pointer-events-none"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="text-white font-display font-bold tracking-widest uppercase text-sm drop-shadow-md">
                        {label}
                    </span>
                    {subLabel && (
                        <span className="text-xs font-mono font-medium" style={{ color: color, textShadow: `0 0 10px ${color}` }}>
                            {subLabel}
                        </span>
                    )}
                </motion.div>
            )}
        </div>
    );
};
