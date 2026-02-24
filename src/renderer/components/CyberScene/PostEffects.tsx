import React from 'react';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction, Resolution } from 'postprocessing';
import { Vector2 } from 'three';

interface PostEffectsProps {
  quality: 'low' | 'medium' | 'high';
}

const MediumEffects: React.FC = () => (
  <EffectComposer>
    <Bloom
      luminanceThreshold={0.6}
      luminanceSmoothing={0.4}
      intensity={0.8}
      mipmapBlur
    />
  </EffectComposer>
);

const HighEffects: React.FC = () => (
  <EffectComposer>
    <Bloom
      luminanceThreshold={0.5}
      luminanceSmoothing={0.5}
      intensity={1.5}
      mipmapBlur
      levels={8}
      resolutionX={Resolution.AUTO_SIZE}
      resolutionY={Resolution.AUTO_SIZE}
    />
    <ChromaticAberration
      offset={new Vector2(0.0005, 0.0005)}
      blendFunction={BlendFunction.NORMAL}
      radialModulation={false}
      modulationOffset={0}
    />
    <Vignette
      offset={0.1}
      darkness={0.8}
      blendFunction={BlendFunction.NORMAL}
    />
    <Noise
      opacity={0.02}
      blendFunction={BlendFunction.SOFT_LIGHT}
    />
  </EffectComposer>
);

export const PostEffects: React.FC<PostEffectsProps> = ({ quality }) => {
  if (quality === 'low') return null;
  if (quality === 'high') return <HighEffects />;
  return <MediumEffects />;
};
