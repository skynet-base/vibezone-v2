import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles, OrbitControls, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DeviceModel } from './DeviceModel';
import { NODE_CONFIG } from '@shared/types';
import type { AppSettings, NodeId, NodeStatus } from '@shared/types';
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

const QUALITY_PRESETS: Record<AppSettings['quality'], {
  dpr: [number, number];
  sparkles: number;
  antialias: boolean;
  bloom: boolean;
}> = {
  low: { dpr: [1, 1], sparkles: 0, antialias: false, bloom: false },
  medium: { dpr: [1, 1.25], sparkles: 35, antialias: true, bloom: false },
  high: { dpr: [1, 1.7], sparkles: 80, antialias: true, bloom: true },
};

// Mesh network connection lines
const MeshLines: React.FC<{ statuses: Map<NodeId, NodeStatus> }> = ({ statuses }) => {
  const connections = useMemo(() => {
    const lines: { id: string; active: boolean; positions: Float32Array }[] = [];
    const ids = Object.keys(POSITIONS) as NodeId[];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const fromOnline = statuses.get(ids[i])?.connection === 'online';
        const toOnline = statuses.get(ids[j])?.connection === 'online';
        const from = POSITIONS[ids[i]];
        const to = POSITIONS[ids[j]];
        lines.push({
          id: `${ids[i]}-${ids[j]}`,
          active: fromOnline && toOnline,
          positions: new Float32Array([
            from[0], from[1] + 0.5, from[2],
            to[0], to[1] + 0.5, to[2],
          ]),
        });
      }
    }
    return lines;
  }, [statuses]);

  return (
    <group>
      {connections.map((conn) => (
        <line key={conn.id}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[conn.positions, 3]}
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
const GridFloor: React.FC<{ quality: AppSettings['quality'] }> = ({ quality }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
    <planeGeometry args={[20, 20, 40, 40]} />
    <meshStandardMaterial
      color="#050510"
      wireframe
      transparent
      opacity={quality === 'low' ? 0.04 : 0.08}
    />
  </mesh>
);

// Scene content
const SceneContent: React.FC<{
  statuses: NodeStatus[];
  onDeviceClick: (id: NodeId) => void;
  quality: AppSettings['quality'];
}> = ({ statuses, onDeviceClick, quality }) => {
  const statusMap = useMemo(() => {
    const map = new Map<NodeId, NodeStatus>();
    statuses.forEach((s) => map.set(s.nodeId, s));
    return map;
  }, [statuses]);
  const qualityPreset = QUALITY_PRESETS[quality];

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
      <GridFloor quality={quality} />

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
      {qualityPreset.sparkles > 0 && (
        <Sparkles
          count={qualityPreset.sparkles}
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
      {qualityPreset.bloom && (
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
  const quality = useSessionStore((s) => s.settings?.quality ?? 'high') as AppSettings['quality'];
  const { progress } = useProgress();
  const [forceReady, setForceReady] = useState(false);
  const qualityPreset = QUALITY_PRESETS[quality];
  const onlineCount = nodeStatuses.filter((status) => status.connection === 'online').length;
  const sceneReady = progress === 100 || forceReady;

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceReady(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full min-h-0 rounded-2xl overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 4, 8], fov: 40, near: 0.1, far: 50 }}
        dpr={qualityPreset.dpr}
        gl={{
          antialias: qualityPreset.antialias,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
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
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center bg-[#050508]/90 backdrop-blur-sm z-10 transition-opacity duration-700 ease-in-out pointer-events-none ${sceneReady ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="w-10 h-10 border-2 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(0,240,255,0.4)]" />
        <p className="text-[#00F0FF] font-mono text-xs tracking-widest uppercase animate-pulse">
          Ağ Haritası Yükleniyor... {Math.round(progress)}%
        </p>
      </div>

      <div className="absolute left-3 top-3 rounded-lg border border-cyan-400/20 bg-[#050508]/70 px-3 py-2 text-[10px] font-mono text-cyan-300 backdrop-blur-sm pointer-events-none">
        NETWORK STATUS: {onlineCount}/{NODE_CONFIG.length} ONLINE
      </div>

      {/* Overlay gradient at bottom for fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(transparent, #050508)',
        }}
      />
    </div>
  );
};
