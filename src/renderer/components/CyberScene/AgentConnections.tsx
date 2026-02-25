import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Session, Task } from '@shared/types';
import { AGENT_INFO } from '@shared/types';
import { useAgentConnections } from './hooks/useAgentConnections';

interface AgentConnectionsProps {
  sessions: Session[];
  tasks: Task[];
  positions: Map<string, [number, number, number]>;
}

const EnergyLine: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  colorA: string;
  colorB: string;
}> = ({ from, to, colorA, colorB }) => {
  const lineRef = useRef<THREE.Line>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const opacityRef = useRef(0.35);

  const mixedColor = useMemo(() => {
    const a = new THREE.Color(colorA);
    const b = new THREE.Color(colorB);
    return a.lerp(b, 0.5);
  }, [colorA, colorB]);

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      from[0], from[1], from[2],
      to[0], to[1], to[2],
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: mixedColor,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return new THREE.Line(geo, mat);
  }, [from, to, mixedColor]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Pulse opacity
    opacityRef.current = 0.25 + Math.sin(t * 2) * 0.1;
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = opacityRef.current;
    }

    // Animate energy dot along the line
    if (dotRef.current) {
      const progress = (t * 0.4) % 1;
      dotRef.current.position.set(
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
        from[2] + (to[2] - from[2]) * progress,
      );
    }
  });

  return (
    <group>
      {/* Connection line */}
      <primitive ref={lineRef} object={lineObj} />

      {/* Energy dot */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial
          color={mixedColor}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const GroupHalo: React.FC<{
  center: [number, number, number];
  radius: number;
  color: THREE.Color;
}> = ({ center, radius, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.04 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={center} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.05}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const AgentConnections: React.FC<AgentConnectionsProps> = ({
  sessions,
  tasks,
  positions,
}) => {
  const connections = useAgentConnections(sessions, tasks);

  // Compute group halos
  const groupHalos = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const conn of connections) {
      const key = conn.taskId;
      const existing = groups.get(key) || [];
      if (!existing.includes(conn.from)) existing.push(conn.from);
      if (!existing.includes(conn.to)) existing.push(conn.to);
      groups.set(key, existing);
    }

    const halos: { center: [number, number, number]; radius: number; color: THREE.Color }[] = [];
    for (const [, sessionIds] of groups) {
      if (sessionIds.length < 2) continue;
      let cx = 0, cz = 0;
      let count = 0;
      const colors: THREE.Color[] = [];
      for (const sid of sessionIds) {
        const pos = positions.get(sid);
        const session = sessions.find(s => s.id === sid);
        if (pos && session) {
          cx += pos[0];
          cz += pos[2];
          count++;
          colors.push(new THREE.Color(AGENT_INFO[session.agentType].color));
        }
      }
      if (count >= 2) {
        cx /= count;
        cz /= count;
        // Calculate radius to encompass all members
        let maxDist = 0;
        for (const sid of sessionIds) {
          const pos = positions.get(sid);
          if (pos) {
            const d = Math.sqrt((pos[0] - cx) ** 2 + (pos[2] - cz) ** 2);
            if (d > maxDist) maxDist = d;
          }
        }
        const avgColor = colors.reduce((acc, c) => acc.lerp(c, 1 / colors.length), new THREE.Color(0, 0, 0));
        halos.push({
          center: [cx, 0.05, cz],
          radius: maxDist + 0.6,
          color: avgColor,
        });
      }
    }
    return halos;
  }, [connections, positions, sessions]);

  if (connections.length === 0) return null;

  return (
    <group>
      {/* Energy lines between connected agents */}
      {connections.map((conn, i) => {
        const fromPos = positions.get(conn.from);
        const toPos = positions.get(conn.to);
        if (!fromPos || !toPos) return null;

        const fromSession = sessions.find(s => s.id === conn.from);
        const toSession = sessions.find(s => s.id === conn.to);
        if (!fromSession || !toSession) return null;

        return (
          <EnergyLine
            key={`${conn.from}-${conn.to}-${i}`}
            from={fromPos}
            to={toPos}
            colorA={AGENT_INFO[fromSession.agentType].color}
            colorB={AGENT_INFO[toSession.agentType].color}
          />
        );
      })}

      {/* Group halos */}
      {groupHalos.map((halo, i) => (
        <GroupHalo key={i} {...halo} />
      ))}
    </group>
  );
};
