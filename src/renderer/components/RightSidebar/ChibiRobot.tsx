import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SessionStatus, AgentType } from '@shared/types';
import { AGENT_COLORS, NODE_CONFIG } from '@shared/types';

interface ChibiRobotProps {
  agentType: AgentType | string;
  status: SessionStatus;
  name: string;
  nodeId?: string;
  position: [number, number, number];
  isActive?: boolean;
  onClick?: () => void;
}

export const ChibiRobot: React.FC<ChibiRobotProps> = ({
  agentType,
  status,
  name,
  nodeId,
  position,
  isActive = false,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const agentColor = AGENT_COLORS[agentType as AgentType] || '#5a5a78';
  const pcNode = nodeId ? NODE_CONFIG.find((n) => n.id === nodeId) : null;

  const matProps = useMemo(() => ({
    color: '#0a0a1e',
    emissive: new THREE.Color(agentColor),
    emissiveIntensity: 0.08,
    metalness: 0.85,
    roughness: 0.15,
  }), [agentColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (status === 'working') {
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 5)) * 0.05;
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity !== undefined && mat.emissiveIntensity < 2) {
            mat.emissiveIntensity = 0.3 + Math.sin(t * 6) * 0.2;
          }
        }
      });
    } else if (status === 'idle') {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2) * 0.04;
    } else if (status === 'waiting') {
      const s = 1 + Math.sin(t * 1.5) * 0.018;
      groupRef.current.scale.setScalar(s);
      groupRef.current.position.y = position[1];
    } else {
      groupRef.current.position.y = position[1];
    }
  });

  const isOffline = status === 'offline';
  const opacity = isOffline ? 0.25 : 1;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
    >
      {/* Kafa (large, ~40% of height) */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.38, 0.38, 0.35]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Visor / Eyes */}
      <mesh position={[0, 0.57, 0.18]}>
        <boxGeometry args={[0.24, 0.08, 0.02]} />
        <meshStandardMaterial
          color={agentColor}
          emissive={agentColor}
          emissiveIntensity={isOffline ? 0.1 : 1.8}
          transparent={isOffline}
          opacity={opacity}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.3, 0.32, 0.22]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Core light on chest */}
      <mesh position={[0, 0.18, 0.12]}>
        <circleGeometry args={[0.055, 12]} />
        <meshStandardMaterial
          color={agentColor}
          emissive={agentColor}
          emissiveIntensity={isOffline ? 0.2 : 2.2}
          side={THREE.DoubleSide}
          transparent={isOffline}
          opacity={opacity}
        />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.22, 0.2, 0]}>
        <capsuleGeometry args={[0.055, 0.22, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.22, 0.2, 0]}>
        <capsuleGeometry args={[0.055, 0.22, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.09, -0.15, 0]}>
        <capsuleGeometry args={[0.065, 0.26, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.09, -0.15, 0]}>
        <capsuleGeometry args={[0.065, 0.26, 4, 6]} />
        <meshStandardMaterial {...matProps} opacity={opacity} transparent={isOffline} />
      </mesh>

      {/* Status ring (floor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[0.28, 0.38, 24]} />
        <meshBasicMaterial
          color={agentColor}
          transparent
          opacity={isOffline ? 0.04 : (status === 'working' ? 0.5 : 0.18)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Point light glow */}
      {!isOffline && (
        <pointLight
          color={agentColor}
          intensity={status === 'working' ? 1.4 : status === 'idle' ? 0.4 : 0.15}
          distance={3}
          decay={2}
        />
      )}

      {/* PC Badge + Name label */}
      <Html
        position={[0, 0.98, 0]}
        center
        distanceFactor={7}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: 8,
            fontFamily: 'monospace',
            color: agentColor,
            textShadow: `0 0 6px ${agentColor}`,
            whiteSpace: 'nowrap',
            background: 'rgba(2,2,5,0.75)',
            padding: '1px 4px',
            borderRadius: 3,
          }}>
            {name}
          </span>
          {pcNode && (
            <span style={{
              fontSize: 7,
              fontFamily: 'monospace',
              color: pcNode.color,
              background: `${pcNode.color}18`,
              border: `1px solid ${pcNode.color}30`,
              padding: '0px 3px',
              borderRadius: 2,
              letterSpacing: '0.05em',
            }}>
              {pcNode.name.toUpperCase()}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};
