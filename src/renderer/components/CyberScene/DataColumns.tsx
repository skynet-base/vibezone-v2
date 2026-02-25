import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ColumnDef {
  position: [number, number, number];
  height: number;
  color: string;
}

const COLUMNS: ColumnDef[] = [
  { position: [4.5, 0, 2], height: 2.5, color: '#00ccff' },
  { position: [-4.5, 0, -1.5], height: 2.0, color: '#8b5cf6' },
  { position: [3, 0, -4], height: 1.8, color: '#00ff88' },
  { position: [-3.5, 0, 3.5], height: 2.2, color: '#00ccff' },
  { position: [5, 0, -3], height: 1.5, color: '#8b5cf6' },
];

const DataColumn: React.FC<{ def: ColumnDef }> = ({ def }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(def.color), [def.color]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.15 + 0.08 * Math.sin(state.clock.elapsedTime * 1.2 + def.position[0]);
      material.opacity = pulse;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[def.position[0], def.height / 2, def.position[2]]}
    >
      <cylinderGeometry args={[0.02, 0.02, def.height, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2}
        toneMapped={false}
      />
    </mesh>
  );
};

export const DataColumns: React.FC = () => {
  return (
    <group>
      {COLUMNS.map((col, i) => (
        <DataColumn key={i} def={col} />
      ))}
    </group>
  );
};
