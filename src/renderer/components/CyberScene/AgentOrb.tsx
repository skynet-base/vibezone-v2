import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { Session } from '@shared/types';
import { AGENT_INFO } from '@shared/types';
import { WorkingEffects } from './WorkingEffects';

interface AgentOrbProps {
  session: Session;
  position: [number, number, number];
  isActive: boolean;
  onClick: (sessionId: string) => void;
}

const STATUS_CONFIG = {
  working: { emissive: 1.2, glowOpacity: 0.25, ringSpeed: 3.5, pulseScale: true },
  idle: { emissive: 0.4, glowOpacity: 0.12, ringSpeed: 0.5, pulseScale: false },
  waiting: { emissive: 0.5, glowOpacity: 0.12, ringSpeed: 0.0, pulseScale: false },
  offline: { emissive: 0.1, glowOpacity: 0.08, ringSpeed: 0.0, pulseScale: false },
} as const;

const STATUS_LABELS: Record<string, string> = {
  idle: 'Bosta',
  working: 'Calisiyor',
  waiting: 'Bekliyor',
  offline: 'Kapali',
};

function truncatePath(cwd: string, max = 30): string {
  if (cwd.length <= max) return cwd;
  const parts = cwd.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return '...' + cwd.slice(-max + 3);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
}

export const AgentOrb: React.FC<AgentOrbProps> = ({
  session,
  position,
  isActive,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const fresnelRef = useRef<THREE.Mesh>(null);
  const tempVec = useRef(new THREE.Vector3());
  const [hovered, setHovered] = useState(false);
  const clickBounce = useRef(0);
  const clickEmissive = useRef(0);

  const agentInfo = AGENT_INFO[session.agentType];
  const color = useMemo(() => new THREE.Color(agentInfo.color), [agentInfo.color]);
  const statusCfg = STATUS_CONFIG[session.status];

  const handleClick = useCallback(() => {
    clickBounce.current = 1.0;
    clickEmissive.current = 1.5;
    onClick(session.id);
  }, [onClick, session.id]);

  const handlePointerOver = useCallback((e: any) => { 
    e.stopPropagation(); 
    setHovered(true); 
    document.body.style.cursor = 'pointer';
  }, []);
  const handlePointerOut = useCallback(() => { 
    setHovered(false); 
    document.body.style.cursor = 'auto';
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Ring rotation
    if (ringRef.current && statusCfg.ringSpeed > 0) {
      ringRef.current.rotation.z += delta * statusCfg.ringSpeed;
    }

    // Scale pulse for working status - enhanced (0.9 to 1.15)
    if (coreRef.current && statusCfg.pulseScale) {
      const pulse = 1.0 + 0.15 * Math.sin(t * 3);
      coreRef.current.scale.setScalar(pulse);
    }

    // Emissive breathing effect for working status
    if (materialRef.current && statusCfg.pulseScale) {
      materialRef.current.emissiveIntensity = statusCfg.emissive + 0.4 * Math.sin(t * 4) + clickEmissive.current;
    } else if (materialRef.current) {
      materialRef.current.emissiveIntensity = statusCfg.emissive + clickEmissive.current;
    }

    // Waiting status vibration
    if (session.status === 'waiting' && groupRef.current) {
      groupRef.current.position.x = position[0] + Math.sin(t * 15) * 0.003;
    }

    // Click bounce decay
    if (clickBounce.current > 0) {
      clickBounce.current *= 0.9;
      if (clickBounce.current < 0.01) clickBounce.current = 0;
    }

    // Click emissive spike decay
    if (clickEmissive.current > 0) {
      clickEmissive.current *= 0.92;
      if (clickEmissive.current < 0.01) clickEmissive.current = 0;
    }

    // Update Fresnel shader intensity reactively
    if (fresnelRef.current && (fresnelRef.current.material as THREE.ShaderMaterial).uniforms) {
      (fresnelRef.current.material as THREE.ShaderMaterial).uniforms.uIntensity.value = hovered ? 1.4 : 0.9;
    }

    // Hover scale + click bounce
    if (groupRef.current) {
      const bounce = 1.0 + clickBounce.current * 0.15;
      const targetScale = (hovered ? 1.1 : 1.0) * bounce;
      groupRef.current.scale.lerp(
        tempVec.current.setScalar(targetScale),
        0.15
      );
    }
  });

  const opacity = session.status === 'offline' ? 0.5 : 1.0;

  const orbContent = (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Core sphere */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.3, 3]} />
        <meshPhysicalMaterial
          ref={materialRef}
          color={color}
          metalness={0.3}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={statusCfg.emissive + clickEmissive.current}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>

      {/* Fresnel rim glow */}
      <mesh ref={fresnelRef}>
        <icosahedronGeometry args={[0.38, 3]} />
        <shaderMaterial
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
              vViewDir = normalize(-worldPos.xyz);
              gl_Position = projectionMatrix * worldPos;
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            uniform float uIntensity;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);
              gl_FragColor = vec4(uColor, fresnel * uIntensity);
            }
          `}
          uniforms={{
            uColor: { value: new THREE.Color(agentInfo.color) },
            uIntensity: { value: 0.9 },
          }}
          transparent={true}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Glow shell */}
      <mesh>
        <icosahedronGeometry args={[0.34, 3]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={statusCfg.glowOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Working effects: particles + ring pulse */}
      <WorkingEffects
        color={color}
        active={session.status === 'working'}
        baseY={position[1]}
      />

      {/* Active highlight ring */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.015, 8, 64]} />
          <meshBasicMaterial
            color="#00ccff"
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Orbital ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.45, 0.008, 8, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={session.status === 'offline' ? 0.15 : 0.35}
          toneMapped={false}
        />
      </mesh>

      {/* Base pad on ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -position[1] + 0.02, 0]}
      >
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="top"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {session.name}
      </Text>

      {/* Status text */}
      <Text
        position={[0, -0.65, 0]}
        fontSize={0.08}
        color={session.status === 'working' ? '#00ff88' : session.status === 'waiting' ? '#f59e0b' : '#666666'}
        anchorX="center"
        anchorY="top"
      >
        {STATUS_LABELS[session.status] || session.status}
      </Text>

      {/* Emoji via Html overlay */}
      <Html
        position={[0, 0.55, 0]}
        center
        distanceFactor={5}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <span style={{ fontSize: '16px' }}>{agentInfo.emoji}</span>
      </Html>

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, 0.9, 0]}
          center
          distanceFactor={5}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: 'rgba(12, 12, 20, 0.9)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${agentInfo.color}40`,
              borderRadius: '8px',
              padding: '8px 12px',
              minWidth: '140px',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: agentInfo.color, marginBottom: '4px' }}>
              {session.name}
            </div>
            <div style={{ fontSize: '9px', color: '#999', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{agentInfo.label}</span>
              <span style={{
                width: '4px', height: '4px', borderRadius: '50%',
                backgroundColor: session.status === 'working' ? '#00ff88' : session.status === 'waiting' ? '#f59e0b' : session.status === 'idle' ? '#00ccff' : '#666',
                display: 'inline-block',
              }} />
              <span>{STATUS_LABELS[session.status] || session.status}</span>
            </div>
            <div style={{ fontSize: '8px', color: '#666', marginTop: '3px', fontFamily: 'monospace' }}>
              {truncatePath(session.cwd)}
            </div>
          </div>
        </Html>
      )}

      {/* Point light for local illumination */}
      <pointLight
        color={color}
        intensity={statusCfg.emissive * 0.5}
        distance={2}
        decay={2}
      />
    </group>
  );

  // Wrap idle agents in Float for gentle bobbing
  if (session.status === 'idle') {
    return (
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.05, 0.05]}>
        {orbContent}
      </Float>
    );
  }

  return orbContent;
};
