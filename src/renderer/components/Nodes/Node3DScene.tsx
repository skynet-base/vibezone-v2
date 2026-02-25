import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DeviceModel } from './DeviceModel';
import { NODE_CONFIG } from '@shared/types';
import type { NodeId, NodeStatus } from '@shared/types';
import { useSessionStore } from '../../hooks/useSessionStore';

const DEVICE_MAP: Record<string, 'tower' | 'laptop' | 'server'> = {
  pc1: 'tower',
  pc2: 'tower',
  vps: 'server',
  pc4: 'laptop',
};

const POSITIONS: Record<string, [number, number, number]> = {
  pc1: [-2.5, 0, 0],
  pc2: [-0.8, 0, 1],
  vps: [0.8, 0, 1],
  pc4: [2.5, 0, 0],
};

// Mesh network connection lines
const MeshLines: React.FC<{ statuses: Map<NodeId, NodeStatus> }> = ({ statuses }) => {
  const connections = useMemo(() => {
    const lines: { from: [number, number, number]; to: [number, number, number]; active: boolean }[] = [];
    const ids = Object.keys(POSITIONS) as NodeId[];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const fromOnline = statuses.get(ids[i])?.connection === 'online';
        const toOnline = statuses.get(ids[j])?.connection === 'online';
        lines.push({
          from: POSITIONS[ids[i]],
          to: POSITIONS[ids[j]],
          active: fromOnline && toOnline,
        });
      }
    }
    return lines;
  }, [statuses]);

  return (
    <group>
      {connections.map((conn, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                conn.from[0], conn.from[1] + 0.5, conn.from[2],
                conn.to[0], conn.to[1] + 0.5, conn.to[2],
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={conn.active ? '#00F0FF' : '#1a1a2e'}
            transparent
            opacity={conn.active ? 0.4 : 0.1}
            linewidth={1}
          />
        </line>
      ))}
    </group>
  );
};

// Grid floor
const GridFloor: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
    <planeGeometry args={[20, 20, 40, 40]} />
    <meshStandardMaterial
      color="#050510"
      wireframe
      transparent
      opacity={0.08}
    />
  </mesh>
);

// Scene content
const SceneContent: React.FC<{
  statuses: NodeStatus[];
  onDeviceClick: (id: NodeId) => void;
  quality: string;
}> = ({ statuses, onDeviceClick, quality }) => {
  const statusMap = useMemo(() => {
    const map = new Map<NodeId, NodeStatus>();
    statuses.forEach((s) => map.set(s.nodeId, s));
    return map;
  }, [statuses]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.4} color="#c0c0ff" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#00F0FF" distance={15} />

      {/* Fog */}
      <fog attach="fog" args={['#050508', 6, 18]} />
      <color attach="background" args={['#050508']} />

      {/* Grid floor */}
      <GridFloor />

      {/* Devices */}
      {NODE_CONFIG.map((node) => {
        const status = statusMap.get(node.id);
        const ramPct = status?.ram
          ? Math.round((status.ram.usedMB / status.ram.totalMB) * 100)
          : undefined;

        return (
          <DeviceModel
            key={node.id}
            nodeId={node.id}
            name={node.name}
            color={node.color}
            connection={status?.connection || 'offline'}
            deviceType={DEVICE_MAP[node.id] || 'tower'}
            position={POSITIONS[node.id] || [0, 0, 0]}
            ramPercent={ramPct}
            activeAgents={status?.gg_agent_status?.active_tasks ?? 0}
            onClick={() => onDeviceClick(node.id)}
          />
        );
      })}

      {/* Mesh network lines */}
      <MeshLines statuses={statusMap} />

      {/* Ambient particles */}
      {quality !== 'low' && (
        <Sparkles
          count={quality === 'high' ? 80 : 40}
          scale={[12, 4, 8]}
          size={1.5}
          speed={0.3}
          color="#00F0FF"
          opacity={0.3}
        />
      )}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={16}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0.5]}
        enableDamping={true}
        dampingFactor={0.08}
      />

      {/* Post-processing */}
      {quality === 'high' && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={0.8} />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      )}
    </>
  );
};

// Main exported component
export const Node3DScene: React.FC<{
  onDeviceClick: (id: NodeId) => void;
}> = ({ onDeviceClick }) => {
  const nodeStatuses = useSessionStore((s) => s.nodeStatuses);
  const quality = useSessionStore((s) => s.settings?.quality ?? 'high');
  const [sceneReady, setSceneReady] = useState(false);

  return (
    <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 4, 8], fov: 40, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onCreated={() => setSceneReady(true)}
      >
        <Suspense fallback={null}>
          <SceneContent
            statuses={nodeStatuses}
            onDeviceClick={onDeviceClick}
            quality={quality}
          />
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      {!sceneReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-vz-bg/80 backdrop-blur-sm z-10 transition-opacity duration-500">
          <div className="w-8 h-8 border-2 border-vz-cyan/30 border-t-vz-cyan rounded-full animate-spin mb-3" />
          <p className="text-xs text-vz-muted font-display">3D sahne hazirlaniyor...</p>
        </div>
      )}

      {/* Overlay gradient at bottom for fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: 'linear-gradient(transparent, #050508)',
        }}
      />
    </div>
  );
};
