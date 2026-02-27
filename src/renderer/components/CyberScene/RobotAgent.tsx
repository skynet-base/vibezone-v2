import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Session } from '@shared/types';
import { AGENT_INFO } from '@shared/types';
import { ErrorBoundary3D } from '../UI/ErrorBoundary3D';

// Removed FBX dependencies entirely to ensure 100% instant load reliability.

const STATUS_LABELS: Record<string, string> = {
  idle: 'Bosta',
  working: 'Calisiyor',
  waiting: 'Bekliyor',
  offline: 'Kapali',
};

const WALK_SPEED: Record<Session['status'], number> = {
  working: 0.55,
  idle: 0.22,
  waiting: 0.0,
  offline: 0.0,
};

function truncatePath(cwd: string, max = 28): string {
  if (cwd.length <= max) return cwd;
  const parts = cwd.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return '...' + cwd.slice(-max + 3);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
}

// ---- Procedural Robot to bypass FBX loading issues ----
interface ProceduralRobotProps {
  agentColor: string;
  status: Session['status'];
}

const ProceduralRobot: React.FC<ProceduralRobotProps> = ({ agentColor, status }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const speed = status === 'working' ? 4 : status === 'idle' ? 1.5 : 0;

    // Simple walking/hovering animation
    groupRef.current.position.y = Math.abs(Math.sin(t * speed)) * 0.08;

    // Pulse emissive
    groupRef.current.children.forEach((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (status === 'working') {
          mat.emissiveIntensity = 0.5 + Math.sin(t * 5) * 0.3;
        } else if (status === 'waiting') {
          mat.emissiveIntensity = 0.1 + Math.sin(t * 2) * 0.1;
        } else {
          mat.emissiveIntensity = 0.05;
        }
      }
    });

    // Arm swing animation if moving
    if (speed > 0) {
      const leftArm = groupRef.current.children[4];
      const rightArm = groupRef.current.children[5];
      const leftLeg = groupRef.current.children[6];
      const rightLeg = groupRef.current.children[7];
      leftArm.rotation.x = Math.sin(t * speed) * 0.4;
      rightArm.rotation.x = -Math.sin(t * speed) * 0.4;
      leftLeg.rotation.x = -Math.sin(t * speed) * 0.3;
      rightLeg.rotation.x = Math.sin(t * speed) * 0.3;
    }
  });

  const matProps = useMemo(() => ({
    color: '#0f0f1a',
    emissive: agentColor,
    emissiveIntensity: 0.1,
    metalness: 0.8,
    roughness: 0.2,
  }), [agentColor]);

  return (
    <group ref={groupRef} position={[0, -0.05, 0]}>
      {/* Head */}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Eye / Visor */}
      <mesh position={[0, 1.27, 0.12]}>
        <boxGeometry args={[0.16, 0.06, 0.02]} />
        <meshStandardMaterial color={agentColor} emissive={agentColor} emissiveIntensity={1.5} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.18]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Core light */}
      <mesh position={[0, 0.85, 0.1]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color={agentColor} emissive={agentColor} emissiveIntensity={2.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Left Arm */}
      <mesh position={[-0.22, 0.9, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Right Arm */}
      <mesh position={[0.22, 0.9, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Left Leg */}
      <mesh position={[-0.08, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Right Leg */}
      <mesh position={[0.08, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
};

// ---- Status ring under feet ----
const StatusRing: React.FC<{ color: string; status: Session['status'] }> = ({ color, status }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    const t = state.clock.elapsedTime;
    if (status === 'working') {
      mat.opacity = 0.45 + Math.sin(t * 4.5) * 0.25;
      ref.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.12);
    } else if (status === 'idle') {
      mat.opacity = 0.2 + Math.sin(t * 1.5) * 0.05;
      ref.current.scale.setScalar(1);
    } else if (status === 'waiting') {
      mat.opacity = 0.15;
      ref.current.scale.setScalar(1);
    } else {
      mat.opacity = 0.06;
      ref.current.scale.setScalar(1);
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[0.42, 0.58, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ---- Base RobotAgent (static position, used by WalkingRobotAgent) ----
export interface RobotAgentProps {
  session: Session;
  sessionIndex: number;
  circleAngle: number;
  circleRadius: number;
  isActive: boolean;
  onClick: (id: string) => void;
}

export const RobotAgent: React.FC<RobotAgentProps> = ({
  session,
  sessionIndex,
  circleAngle,
  circleRadius,
  isActive,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const agentInfo = AGENT_INFO[session.agentType];
  const agentColor = agentInfo.color;

  const handleClick = useCallback(() => onClick(session.id), [onClick, session.id]);

  const handlePointerOver = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const x = Math.cos(circleAngle) * circleRadius;
    const z = Math.sin(circleAngle) * circleRadius;

    // Smooth position update
    groupRef.current.position.x += (x - groupRef.current.position.x) * delta * 5;
    groupRef.current.position.z += (z - groupRef.current.position.z) * delta * 5;

    // Face movement direction (tangent)
    const targetY = circleAngle + Math.PI / 2;
    let dy = targetY - groupRef.current.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    groupRef.current.rotation.y += dy * delta * 5;

    // Vertical offsets by status
    const t = state.clock.elapsedTime;
    if (session.status === 'idle') {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.015;
    } else if (session.status === 'waiting') {
      groupRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.02);
    } else {
      groupRef.current.position.y = 0;
    }
  });

  const statusColor =
    session.status === 'working' ? '#00ff88'
      : session.status === 'waiting' ? '#f59e0b'
        : session.status === 'idle' ? '#00ccff'
          : '#555555';

  const LABEL_Y = 1.85;

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Robot model */}
      <ProceduralRobot
        agentColor={agentColor}
        status={session.status}
      />

      {/* Status ring */}
      <StatusRing color={agentColor} status={session.status} />

      {/* Active selection ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.65, 0.82, 48]} />
          <meshBasicMaterial
            color="#00ccff"
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Name and Status labels */}
      <ErrorBoundary3D>
        <Text
          position={[0, LABEL_Y, 0]}
          fontSize={0.14}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.013}
          outlineColor="#000000"
        >
          {session.name}
        </Text>

        <Text
          position={[0, LABEL_Y - 0.2, 0]}
          fontSize={0.095}
          color={statusColor}
          anchorX="center"
          anchorY="bottom"
        >
          {STATUS_LABELS[session.status] || session.status}
        </Text>
      </ErrorBoundary3D>

      {/* Point light glow */}
      <pointLight
        color={agentColor}
        intensity={session.status === 'working' ? 1.6 : session.status === 'idle' ? 0.5 : 0.2}
        distance={4}
        decay={2}
      />

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, LABEL_Y + 0.45, 0]}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: 'rgba(6, 6, 16, 0.94)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${agentColor}55`,
              borderRadius: '8px',
              padding: '8px 12px',
              minWidth: '152px',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: agentColor, marginBottom: '4px' }}>
              {agentInfo.emoji} {session.name}
            </div>
            <div style={{ fontSize: '9px', color: '#aaa', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{agentInfo.label}</span>
              <span
                style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  backgroundColor: statusColor,
                  display: 'inline-block',
                  boxShadow: `0 0 5px ${statusColor}`,
                }}
              />
              <span style={{ color: statusColor }}>{STATUS_LABELS[session.status] || session.status}</span>
            </div>
            <div style={{ fontSize: '8px', color: '#555', marginTop: '4px', fontFamily: 'monospace' }}>
              {truncatePath(session.cwd)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// ---- WalkingRobotAgent: handles its own circular walking via useFrame ----
export interface WalkingRobotAgentProps {
  session: Session;
  sessionIndex: number;
  baseAngle: number;
  circleRadius: number;
  isActive: boolean;
  onClick: (id: string) => void;
}

export const WalkingRobotAgent: React.FC<WalkingRobotAgentProps> = ({
  session,
  sessionIndex,
  baseAngle,
  circleRadius,
  isActive,
  onClick,
}) => {
  const angleRef = useRef(baseAngle);

  // Reset angle when baseAngle changes (new session added/removed)
  useEffect(() => {
    angleRef.current = baseAngle;
  }, [baseAngle]);

  // Advance angle each frame based on status
  useFrame((_, delta) => {
    const speed = WALK_SPEED[session.status] ?? 0;
    angleRef.current += delta * speed;
  });

  // We need to pass the live angle to RobotAgent.
  // Since RobotAgent reads circleAngle from props we use a ref-forwarding trick:
  // RobotAgent's useFrame reads its own circleAngle prop every frame.
  // We solve this by making RobotAgent accept a ref getter instead of a static angle.
  return (
    <RobotAgentAnimated
      session={session}
      sessionIndex={sessionIndex}
      angleRef={angleRef}
      circleRadius={circleRadius}
      isActive={isActive}
      onClick={onClick}
    />
  );
};

// ---- Internal animated variant that reads from angleRef every frame ----
interface RobotAgentAnimatedProps {
  session: Session;
  sessionIndex: number;
  angleRef: React.RefObject<number>;
  circleRadius: number;
  isActive: boolean;
  onClick: (id: string) => void;
}

const RobotAgentAnimated: React.FC<RobotAgentAnimatedProps> = ({
  session,
  sessionIndex,
  angleRef,
  circleRadius,
  isActive,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const agentInfo = AGENT_INFO[session.agentType];
  const agentColor = agentInfo.color;

  const handleClick = useCallback(() => onClick(session.id), [onClick, session.id]);

  const handlePointerOver = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const angle = angleRef.current ?? 0;

    const x = Math.cos(angle) * circleRadius;
    const z = Math.sin(angle) * circleRadius;

    // Smooth lerp to new position
    groupRef.current.position.x += (x - groupRef.current.position.x) * delta * 6;
    groupRef.current.position.z += (z - groupRef.current.position.z) * delta * 6;

    // Face direction of travel (tangent to circle)
    const facingAngle = angle + Math.PI / 2;
    let dy = facingAngle - groupRef.current.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    groupRef.current.rotation.y += dy * delta * 5;

    // Status-based vertical animations
    const t = state.clock.elapsedTime;
    if (session.status === 'idle') {
      groupRef.current.position.y = Math.sin(t * 1.5 + angle) * 0.015;
    } else if (session.status === 'waiting') {
      const breathe = 1 + Math.sin(t * 1.2) * 0.018;
      groupRef.current.scale.setScalar(breathe);
      groupRef.current.position.y = 0;
    } else {
      groupRef.current.scale.setScalar(1);
      groupRef.current.position.y = 0;
    }
  });

  const statusColor =
    session.status === 'working' ? '#00ff88'
      : session.status === 'waiting' ? '#f59e0b'
        : session.status === 'idle' ? '#00ccff'
          : '#555555';

  const LABEL_Y = 1.85;

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Robot model */}
      <ProceduralRobot
        agentColor={agentColor}
        status={session.status}
      />

      {/* Status ring */}
      <StatusRing color={agentColor} status={session.status} />

      {/* Active selection ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.65, 0.82, 48]} />
          <meshBasicMaterial
            color="#00ccff"
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Name and Status labels */}
      <ErrorBoundary3D>
        <Text
          position={[0, LABEL_Y, 0]}
          fontSize={0.14}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.013}
          outlineColor="#000000"
        >
          {session.name}
        </Text>

        <Text
          position={[0, LABEL_Y - 0.2, 0]}
          fontSize={0.095}
          color={statusColor}
          anchorX="center"
          anchorY="bottom"
        >
          {STATUS_LABELS[session.status] || session.status}
        </Text>
      </ErrorBoundary3D>

      {/* Point light glow per robot */}
      <pointLight
        color={agentColor}
        intensity={session.status === 'working' ? 1.6 : session.status === 'idle' ? 0.5 : 0.2}
        distance={4}
        decay={2}
      />

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, LABEL_Y + 0.45, 0]}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: 'rgba(6, 6, 16, 0.94)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${agentColor}55`,
              borderRadius: '8px',
              padding: '8px 12px',
              minWidth: '152px',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: agentColor, marginBottom: '4px' }}>
              {agentInfo.emoji} {session.name}
            </div>
            <div style={{ fontSize: '9px', color: '#aaa', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{agentInfo.label}</span>
              <span
                style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  backgroundColor: statusColor,
                  display: 'inline-block',
                  boxShadow: `0 0 5px ${statusColor}`,
                }}
              />
              <span style={{ color: statusColor }}>{STATUS_LABELS[session.status] || session.status}</span>
            </div>
            <div style={{ fontSize: '8px', color: '#555', marginTop: '4px', fontFamily: 'monospace' }}>
              {truncatePath(session.cwd)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
