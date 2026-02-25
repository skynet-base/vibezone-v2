import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WorkingEffectsProps {
  color: THREE.Color;
  active: boolean;
  baseY: number;
}

const PARTICLE_COUNT = 20;

export const WorkingEffects: React.FC<WorkingEffectsProps> = ({ color, active, baseY }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ringOpacity = useRef(0);
  const ring2Opacity = useRef(0);

  const particlePositions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const r = 0.15 + Math.random() * 0.2;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = Math.random() * 0.5;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    return arr;
  }, []);

  const particleSizes = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i] = 2 + Math.random() * 3;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!active) return;
    const t = state.clock.elapsedTime;

    // Animate particles rising (1.5x faster)
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const speed = (0.3 + (i % 3) * 0.15) * 1.5;
        positions[i * 3 + 1] = ((t * speed + i * 0.5) % 1.2) * 0.8;
        const angle = t * 0.5 + (i / PARTICLE_COUNT) * Math.PI * 2;
        const r = 0.15 + Math.sin(t * 2 + i) * 0.05;
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 2] = Math.sin(angle) * r;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Ring pulse: expand and fade every 2s
    if (ringRef.current) {
      const cycle = (t % 2.0) / 2.0; // 0..1
      const scale = 0.3 + cycle * 0.7;
      ringRef.current.scale.setScalar(scale);
      ringOpacity.current = (1 - cycle) * 0.4;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = ringOpacity.current;
    }

    // Second ring with 1.5x delay
    if (ring2Ref.current) {
      const delayedT = t + 1.5;
      const cycle = (delayedT % 2.0) / 2.0;
      const scale = 0.3 + cycle * 1.05;
      ring2Ref.current.scale.setScalar(scale);
      ring2Opacity.current = (1 - cycle) * 0.2;
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = ring2Opacity.current;
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Rising particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[particleSizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.05}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          sizeAttenuation
        />
      </points>

      {/* Ground ring pulse */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -baseY + 0.03, 0]}
      >
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Second ring - larger radius, delayed */}
      <mesh
        ref={ring2Ref}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -baseY + 0.03, 0]}
      >
        <ringGeometry args={[0.45, 0.52, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
