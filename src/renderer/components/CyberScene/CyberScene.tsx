import React, { Suspense, useCallback, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSessionStore } from '../../hooks/useSessionStore';
import { Platform } from './Platform';
import { AmbientParticles } from './AmbientParticles';
import { PostEffects } from './PostEffects';
import { RobotAgents } from './RobotAgents';
import { EnergyConnections } from './EnergyConnections';
import { useAgentPositions } from './hooks/useAgentPositions';

const SceneFallback: React.FC = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshBasicMaterial color="#00F0FF" wireframe />
  </mesh>
);

// Demo robot when no sessions — walks in a circle with "Waiting for agents..." text
const DemoRobot: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);
  const RADIUS = 1.8;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    angleRef.current += delta * 0.35;
    const a = angleRef.current;
    groupRef.current.position.set(Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
    groupRef.current.rotation.y = a + Math.PI / 2;
  });

  const demoColor = '#00F0FF';

  return (
    <group ref={groupRef}>
      {/* Simple geometric robot proxy */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.35, 0.45, 0.2]} />
        <meshStandardMaterial color={demoColor} emissive={demoColor} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.2]} />
        <meshStandardMaterial color={demoColor} emissive={demoColor} emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, 0.6, 0]}>
        <boxGeometry args={[0.12, 0.55, 0.15]} />
        <meshStandardMaterial color={demoColor} emissive={demoColor} emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.1, 0.6, 0]}>
        <boxGeometry args={[0.12, 0.55, 0.15]} />
        <meshStandardMaterial color={demoColor} emissive={demoColor} emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Status ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color={demoColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={demoColor} intensity={0.8} distance={3} decay={2} />
    </group>
  );
};

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

  // Base positions (circle) for EnergyConnections orb routing
  const basePositions = useAgentPositions(sessions, tasks);

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
      <ambientLight intensity={0.08} color="#050515" />
      <pointLight position={[0, 8, 0]} color="#ffffff" intensity={0.15} distance={20} />
      <pointLight position={[6, 4, 6]} color="#00F0FF" intensity={0.3} distance={18} />
      <pointLight position={[-6, 3, -6]} color="#B200FF" intensity={0.25} distance={18} />

      {/* Cyberpunk neon fog */}
      <fog attach="fog" args={['#030308', 8, 25]} />

      {/* Scene objects */}
      <Suspense fallback={<SceneFallback />}>
        <Platform />

        {sessions.length > 0 ? (
          <>
            {/* 3D Robot agents walking in circle */}
            <RobotAgents
              sessions={sessions}
              tasks={tasks}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
            />

            {/* Energy orb connections between working robots */}
            <EnergyConnections
              sessions={sessions}
              tasks={tasks}
              positions={basePositions}
            />
          </>
        ) : (
          <group>
            {/* Demo robot walking alone */}
            <DemoRobot />

            {/* Central orb */}
            <DemoOrb />

            <Text
              position={[0, 2.8, 0]}
              fontSize={0.75}
              color="#00F0FF"
              anchorX="center"
              anchorY="middle"
            >
              VIBEZONE
            </Text>
            <Text
              position={[0, 2.0, 0]}
              fontSize={0.18}
              color="#445566"
              anchorX="center"
              anchorY="middle"
            >
              Agent ekleyerek baslayin
            </Text>
          </group>
        )}

        <AmbientParticles quality={quality} enabled={particlesEnabled} />
      </Suspense>

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.5, 0]}
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
    <div className="w-full h-full" style={{ background: '#020208' }}>
      <Canvas
        camera={{ position: [0, 5, 8], fov: 45, near: 0.1, far: 50 }}
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
        <color attach="background" args={['#020208']} />
        <SceneContent />
      </Canvas>
      {!sceneReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#020208]">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
