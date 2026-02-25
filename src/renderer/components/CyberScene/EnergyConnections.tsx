import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Session, Task } from '@shared/types';
import { AGENT_INFO } from '@shared/types';
import { useAgentConnections } from './hooks/useAgentConnections';

interface EnergyConnectionsProps {
  sessions: Session[];
  tasks: Task[];
  positions: Map<string, [number, number, number]>;
}

// ---- Single energy orb traveling along a bezier arc ----
interface EnergyOrbProps {
  from: [number, number, number];
  to: [number, number, number];
  color: THREE.Color;
  timeOffset: number;
  speed: number;
}

const EnergyOrb: React.FC<EnergyOrbProps> = ({ from, to, color, timeOffset, speed }) => {
  const orbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Build bezier control point: midpoint raised up
  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...from);
    const p2 = new THREE.Vector3(...to);
    const mid = p0.clone().lerp(p2, 0.5);
    const dist = p0.distanceTo(p2);
    mid.y += dist * 0.4 + 0.5;
    return new THREE.QuadraticBezierCurve3(p0, mid, p2);
  }, [from, to]);

  useFrame((state) => {
    const t = ((state.clock.elapsedTime * speed + timeOffset) % 1 + 1) % 1;

    const pos = curve.getPoint(t);
    if (orbRef.current) {
      orbRef.current.position.copy(pos);
    }
    if (glowRef.current) {
      glowRef.current.position.copy(pos);
    }

    // Fade near source and destination
    const fadeFactor = Math.sin(t * Math.PI);
    if (orbRef.current) {
      const mat = orbRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = fadeFactor * 0.95;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = fadeFactor * 0.35;
    }
  });

  return (
    <group>
      {/* Core orb */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Glow shell */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// ---- Arc line between two robots ----
const ArcLine: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  color: THREE.Color;
}> = ({ from, to, color }) => {
  const lineRef = useRef<THREE.Line>(null);

  const lineObj = useMemo(() => {
    const p0 = new THREE.Vector3(...from);
    const p2 = new THREE.Vector3(...to);
    const mid = p0.clone().lerp(p2, 0.5);
    const dist = p0.distanceTo(p2);
    mid.y += dist * 0.4 + 0.5;
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);

    const points = curve.getPoints(24);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return new THREE.Line(geo, mat);
  }, [from, to, color]);

  useFrame((state) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 1.8) * 0.06;
    }
  });

  return <primitive ref={lineRef} object={lineObj} />;
};

// ---- Main EnergyConnections component ----
export const EnergyConnections: React.FC<EnergyConnectionsProps> = ({
  sessions,
  tasks,
  positions,
}) => {
  const connections = useAgentConnections(sessions, tasks);

  // Only show connections for sessions that are working
  const activeConnections = useMemo(() => {
    return connections.filter((conn) => {
      const fromSession = sessions.find((s) => s.id === conn.from);
      const toSession = sessions.find((s) => s.id === conn.to);
      return (
        fromSession?.status === 'working' || toSession?.status === 'working'
      );
    });
  }, [connections, sessions]);

  // For pairs of working sessions, even without shared tasks, create energy orbs
  const workingPairs = useMemo(() => {
    const working = sessions.filter((s) => s.status === 'working');
    if (working.length < 2) return [];

    const pairs: Array<{ from: string; to: string }> = [];
    const seen = new Set<string>();
    for (let i = 0; i < working.length; i++) {
      for (let j = i + 1; j < working.length; j++) {
        const key = [working[i].id, working[j].id].sort().join(':');
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ from: working[i].id, to: working[j].id });
        }
      }
    }
    return pairs;
  }, [sessions]);

  // Merge connection pairs: use activeConnections + workingPairs (deduplicated)
  const allPairs = useMemo(() => {
    const result: Array<{ from: string; to: string; hasTaskLink: boolean }> = [];
    const seen = new Set<string>();

    for (const conn of activeConnections) {
      const key = [conn.from, conn.to].sort().join(':');
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ from: conn.from, to: conn.to, hasTaskLink: true });
      }
    }
    for (const pair of workingPairs) {
      const key = [pair.from, pair.to].sort().join(':');
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ from: pair.from, to: pair.to, hasTaskLink: false });
      }
    }
    return result;
  }, [activeConnections, workingPairs]);

  if (allPairs.length === 0) return null;

  return (
    <group>
      {allPairs.map((pair, pairIdx) => {
        const fromPos = positions.get(pair.from);
        const toPos = positions.get(pair.to);
        if (!fromPos || !toPos) return null;

        const fromSession = sessions.find((s) => s.id === pair.from);
        const toSession = sessions.find((s) => s.id === pair.to);
        if (!fromSession || !toSession) return null;

        const colorFrom = new THREE.Color(AGENT_INFO[fromSession.agentType].color);
        const colorTo = new THREE.Color(AGENT_INFO[toSession.agentType].color);
        const mixedColor = colorFrom.clone().lerp(colorTo, 0.5);

        // Slightly raise orb travel positions from ground level
        const fromHigh: [number, number, number] = [fromPos[0], 0.8, fromPos[2]];
        const toHigh: [number, number, number] = [toPos[0], 0.8, toPos[2]];

        // Multiple orbs per pair with staggered offsets
        const orbCount = pair.hasTaskLink ? 3 : 2;

        return (
          <group key={`${pair.from}-${pair.to}-${pairIdx}`}>
            {/* Faint arc line */}
            <ArcLine from={fromHigh} to={toHigh} color={mixedColor} />

            {/* Forward orbs (from → to) */}
            {Array.from({ length: orbCount }, (_, i) => (
              <EnergyOrb
                key={`orb-fwd-${i}`}
                from={fromHigh}
                to={toHigh}
                color={colorFrom}
                timeOffset={i / orbCount}
                speed={0.35 + pairIdx * 0.05}
              />
            ))}

            {/* Return orb (to → from) */}
            <EnergyOrb
              key="orb-back"
              from={toHigh}
              to={fromHigh}
              color={colorTo}
              timeOffset={0.5}
              speed={0.3 + pairIdx * 0.04}
            />
          </group>
        );
      })}
    </group>
  );
};
