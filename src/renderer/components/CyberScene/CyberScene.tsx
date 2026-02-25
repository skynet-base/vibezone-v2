import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useSessionStore } from '../../hooks/useSessionStore';
import { Platform } from './Platform';
import { AgentOrbs } from './AgentOrbs';
import { AgentConnections } from './AgentConnections';
import { CommandRing } from './CommandRing';
import { DataColumns } from './DataColumns';
import { AmbientParticles } from './AmbientParticles';
import { CameraController } from './CameraController';
import { PostEffects } from './PostEffects';
import { useAgentPositions } from './hooks/useAgentPositions';

const SceneFallback: React.FC = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshBasicMaterial color="#00ccff" wireframe />
  </mesh>
);

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
      <pointLight position={[5, 5, 5]} color="#00ccff" intensity={0.4} distance={20} />
      <pointLight position={[-5, 3, -5]} color="#8b5cf6" intensity={0.3} distance={20} />
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
            <Text
              position={[0, 1.5, 0]}
              fontSize={0.8}
              color="#00ccff"
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
      <CameraController />

      {/* Post-processing */}
      <PostEffects quality={quality} />
    </>
  );
};

export const CyberScene: React.FC = () => {
  return (
    <div className="w-full h-full" style={{ background: '#050508' }}>
      <Canvas
        camera={{ position: [0, 5, 7], fov: 45, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: 3, // ACESFilmicToneMapping
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#050508']} />
        <SceneContent />
      </Canvas>
    </div>
  );
};
