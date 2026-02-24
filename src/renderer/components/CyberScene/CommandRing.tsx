import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const CommandRing: React.FC = () => {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y += delta * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * 0.1;
    }
  });

  return (
    <group position={[0, 0.05, 0]}>
      {/* Primary ring */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.015, 8, 128]} />
        <meshBasicMaterial
          color="#00ccff"
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Secondary ring */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.008, 8, 128]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
