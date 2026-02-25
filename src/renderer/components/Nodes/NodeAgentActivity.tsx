import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface AgentActivityProps {
  /** Number of active agents/tasks running on this node */
  activeCount: number;
  /** Node accent color */
  color: string;
  /** Whether the node is online */
  online: boolean;
}

// Orbiting energy particles around a device
const EnergyOrbs: React.FC<{ count: number; color: string; radius: number }> = ({ count, color, radius }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-calculate orbit parameters per orb
  const orbits = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      speed: 0.8 + Math.random() * 1.2,
      offset: (i / count) * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 0.6,
      yOffset: (Math.random() - 0.5) * 1.2,
      orbRadius: radius + (Math.random() - 0.5) * 0.3,
    }));
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    orbits.forEach((orb, i) => {
      const angle = t * orb.speed + orb.offset;
      dummy.position.set(
        Math.cos(angle) * orb.orbRadius,
        orb.yOffset + Math.sin(t * 0.5 + i) * 0.15,
        Math.sin(angle) * orb.orbRadius + orb.tilt,
      );
      // Scale pulse
      const scale = 0.8 + Math.sin(t * 2 + i * 0.5) * 0.3;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

// Skill flow particles — directional flow from/to device
const SkillParticles: React.FC<{ count: number; color: string }> = ({ count, color }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Start near center, flow outward
      pos[i * 3] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = Math.random() * 1.5 - 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      // Velocity — upward and outward
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = 0.005 + Math.random() * 0.015;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3] += velocities[i * 3];
      posArr[i * 3 + 1] += velocities[i * 3 + 1];
      posArr[i * 3 + 2] += velocities[i * 3 + 2];
      // Reset when too far
      if (posArr[i * 3 + 1] > 1.8) {
        posArr[i * 3] = (Math.random() - 0.5) * 0.3;
        posArr[i * 3 + 1] = -0.5;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.06}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// Holographic task count badge
const TaskBadge: React.FC<{ count: number; color: string }> = ({ count, color }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Gentle bob
    groupRef.current.position.y = 1.6 + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
  });

  return (
    <group ref={groupRef} position={[0.6, 1.6, 0]}>
      {/* Badge background */}
      <mesh>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Ring */}
      <mesh>
        <ringGeometry args={[0.14, 0.16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <Text
        fontSize={0.14}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/SpaceGrotesk-Bold.ttf"
        outlineWidth={0.003}
        outlineColor="#000000"
      >
        {String(count)}
      </Text>
    </group>
  );
};

// Subagent spawn burst effect
const SpawnBurst: React.FC<{ color: string; trigger: number }> = ({ color, trigger }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const PARTICLE_COUNT = 16;

  const burstData = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      dir: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 2,
      ).normalize(),
      speed: 1.5 + Math.random() * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const elapsed = clock.getElapsedTime() - trigger;
    if (elapsed < 0 || elapsed > 1.5) {
      // Hide all
      burstData.forEach((_, i) => {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      return;
    }

    const progress = elapsed / 1.5;
    burstData.forEach((p, i) => {
      const dist = p.speed * elapsed;
      dummy.position.copy(p.dir).multiplyScalar(dist);
      // Fade out via scale
      const scale = (1 - progress) * 0.12;
      dummy.scale.setScalar(Math.max(scale, 0));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={3}
        transparent
        opacity={0.8}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};

// Main exported component
export const NodeAgentActivity: React.FC<AgentActivityProps> = ({
  activeCount,
  color,
  online,
}) => {
  if (!online || activeCount === 0) return null;

  // Scale effects by agent count
  const orbCount = Math.min(activeCount * 3, 15);
  const particleCount = Math.min(activeCount * 8, 50);

  return (
    <group>
      <EnergyOrbs count={orbCount} color={color} radius={0.9} />
      <SkillParticles count={particleCount} color={color} />
      {activeCount > 0 && <TaskBadge count={activeCount} color={color} />}
      <SpawnBurst color={color} trigger={-1} />
    </group>
  );
};
