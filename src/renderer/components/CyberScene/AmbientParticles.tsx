import React from 'react';
import { Sparkles } from '@react-three/drei';

interface AmbientParticlesProps {
  quality: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export const AmbientParticles: React.FC<AmbientParticlesProps> = ({
  quality,
  enabled,
}) => {
  if (!enabled) return null;

  const count = quality === 'low' ? 30 : quality === 'medium' ? 60 : 100;

  return (
    <Sparkles
      count={count}
      size={1.5}
      speed={0.3}
      scale={[12, 4, 12]}
      color="#00ccff"
      opacity={0.4}
    />
  );
};
