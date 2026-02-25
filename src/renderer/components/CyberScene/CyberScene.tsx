import React, { Suspense, useCallback, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSessionStore } from '../../hooks/useSessionStore';
import { Platform } from './Platform';
import { AgentOrbs } from './AgentOrbs';
import { AgentConnections } from './AgentConnections';
import { CommandRing } from './CommandRing';
import { DataColumns } from './DataColumns';
import { AmbientParticles } from './AmbientParticles';
import { PostEffects } from './PostEffects';
import { useAgentPositions } from './hooks/useAgentPositions';

const SceneFallback: React.FC = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshBasicMaterial color="#00F0FF" wireframe />
  </mesh>
);

const DemoOrb: React.FC = () => {
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (orbRef.current) {
      const t = state.clock.elapsedTime;
      orbRef.current.rotation.y = t * 0.3;
      orbRef.current.rotation.x = t * 0.15;
      const scale = 1 + 0.08 * Math.sin(t * 2);
      orbRef.current.scale.setScalar(scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -state.clock.elapsedTime * 0.2;
      ringRef.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial
          color="#00F0FF"
          emissive="#00F0FF"
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.2, 0.02, 16, 64]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

const SceneContent: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const terminalOpen = useSessionStore((s) => s.terminalOpen);
  const toggleTerminal = useSessionStore((s) => s.toggleTerminal);
  const tasks = useSessionStore((s) => s.tasks);
  const settings = useSessionStore((s) => s.settings);

  const quality = settings?.quality ?? 'medium';
  const particlesEnabled = settings?.particlesEnabled ?? true;

  const positions = useAgentPositions(sessions, tasks);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId);
      if (!terminalOpen) {
        toggleTerminal();
      }
    },
    [setActiveSession, terminalOpen, toggleTerminal]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} color="#00F0FF" intensity={0.4} distance={20} />
      <pointLight position={[-5, 3, -5]} color="#B200FF" intensity={0.3} distance={20} />
      <pointLight position={[0, 6, 0]} color="#ffffff" intensity={0.2} distance={15} />
      {/* Fog */}
      <fog attach="fog" args={['#050508', 12, 28]} />

      {/* Scene objects */}
      <Suspense fallback={<SceneFallback />}>
        <Platform />
        {sessions.length > 0 ? (
          <>
            <AgentConnections sessions={sessions} tasks={tasks} positions={positions} />
            <AgentOrbs
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              positions={positions}
            />
          </>
        ) : (
          <group>
            <DemoOrb />
            <Text
              position={[0, 1.8, 0]}
              fontSize={0.8}
              color="#00F0FF"
              anchorX="center"
              anchorY="middle"
            >
              VIBEZONE
            </Text>
            <Text
              position={[0, 0.8, 0]}
              fontSize={0.2}
              color="#666680"
              anchorX="center"
              anchorY="middle"
            >
              Agent ekleyerek baslayin
            </Text>
          </group>
        )}
        <CommandRing />
        <DataColumns />
        <AmbientParticles quality={quality} enabled={particlesEnabled} />
      </Suspense>

      {/* Camera */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.3, 0]}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Post-processing */}
      <PostEffects quality={quality} />
    </>
  );
};

export const CyberScene: React.FC = () => {
  const [sceneReady, setSceneReady] = useState(false);

  return (
    <div className="w-full h-full" style={{ background: '#050508' }}>
      <Canvas
        camera={{ position: [0, 5, 7], fov: 45, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: 3,
        }}
        style={{ width: '100%', height: '100%' }}
        onCreated={() => setSceneReady(true)}
      >
        <color attach="background" args={['#050508']} />
        <SceneContent />
      </Canvas>
      {!sceneReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
