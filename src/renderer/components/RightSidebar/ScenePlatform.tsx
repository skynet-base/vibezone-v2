import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ScenePlatform: React.FC = () => {
  const edgeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (edgeRef.current) {
      const mat = edgeRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(t * 0.8) * 0.15;
    }
  });

  return (
    <group position={[0, -0.32, 0]}>
      {/* Main platform disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.06, 6]} />
        <meshStandardMaterial
          color="#06060f"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glowing edge ring */}
      <mesh ref={edgeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.9, 2.02, 6]} />
        <meshBasicMaterial
          color="#00ccff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Under-glow */}
      <pointLight position={[0, -0.3, 0]} color="#0040FF" intensity={0.5} distance={5} decay={2} />

      {/* Central desk */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.32]} />
        <meshStandardMaterial color="#0d0d22" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Monitor on desk */}
      <mesh position={[0, 0.22, -0.08]}>
        <boxGeometry args={[0.28, 0.18, 0.02]} />
        <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
};
