import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Session } from '@shared/types';
import { AGENT_INFO } from '@shared/types';

const ROBOT_MODELS = [
  '/models/robots/robot1.fbx',
  '/models/robots/robot2.fbx',
  '/models/robots/robot3.fbx',
] as const;

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

// ---- FBX model with centering and material override ----
interface RobotModelProps {
  modelPath: string;
  agentColor: string;
  status: Session['status'];
}

const RobotModel: React.FC<RobotModelProps> = ({ modelPath, agentColor, status }) => {
  const fbx = useFBX(modelPath);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  const cloned = useMemo(() => {
    const clone = fbx.clone(true);

    // Center model and put feet on y=0
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());

    clone.position.sub(center);
    clone.position.y += sz.y / 2;

    // Scale to ~1.4 units tall
    const targetHeight = 1.4;
    const scaleFactor = sz.y > 0 ? targetHeight / sz.y : 1;
    clone.scale.setScalar(scaleFactor);

    // Apply agent color tint materials
    const agentCol = new THREE.Color(agentColor);
    const baseCol = agentCol.clone().multiplyScalar(0.2).add(new THREE.Color('#10102a'));

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        const mat = new THREE.MeshStandardMaterial({
          color: baseCol.clone(),
          emissive: agentCol.clone(),
          emissiveIntensity: 0.06,
          metalness: 0.75,
          roughness: 0.28,
        });
        mesh.material = mat;
      }
    });

    return clone;
  }, [fbx, agentColor]);

  // Setup animation
  useEffect(() => {
    if (!cloned) return;
    if (cloned.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(cloned);
      const action = mixer.clipAction(cloned.animations[0]);
      action.play();
      mixerRef.current = mixer;
    }
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [cloned]);

  useFrame((state, delta) => {
    if (!mixerRef.current) return;
    const speed = WALK_SPEED[status] ?? 1.0;
    mixerRef.current.update(delta * (speed > 0 ? speed * 1.8 : 0));

    // Dynamic emissive pulsing
    const t = state.clock.elapsedTime;
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (!mat?.emissive) return;
        if (status === 'working') {
          mat.emissiveIntensity = 0.22 + Math.sin(t * 3.5) * 0.1;
        } else if (status === 'waiting') {
          mat.emissiveIntensity = 0.05 + Math.sin(t * 1.2) * 0.03;
        } else if (status === 'offline') {
          mat.emissiveIntensity = 0.0;
          mat.color.set('#2a2a35');
        } else {
          mat.emissiveIntensity = 0.06 + Math.sin(t * 0.8) * 0.01;
        }
      }
    });
  });

  return <primitive object={cloned} />;
};

// ---- Loading fallback ----
const RobotFallback: React.FC<{ color: string }> = ({ color }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.6;
  });
  return (
    <mesh ref={ref} position={[0, 0.7, 0]}>
      <boxGeometry args={[0.35, 1.4, 0.25]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} wireframe />
    </mesh>
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
  const modelPath = ROBOT_MODELS[sessionIndex % 3];

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
      <React.Suspense fallback={<RobotFallback color={agentColor} />}>
        <RobotModel
          modelPath={modelPath}
          agentColor={agentColor}
          status={session.status}
        />
      </React.Suspense>

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

      {/* Name label */}
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

      {/* Status label */}
      <Text
        position={[0, LABEL_Y - 0.2, 0]}
        fontSize={0.095}
        color={statusColor}
        anchorX="center"
        anchorY="bottom"
      >
        {STATUS_LABELS[session.status] || session.status}
      </Text>

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
  const modelPath = ROBOT_MODELS[sessionIndex % 3];

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
      <React.Suspense fallback={<RobotFallback color={agentColor} />}>
        <RobotModel
          modelPath={modelPath}
          agentColor={agentColor}
          status={session.status}
        />
      </React.Suspense>

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

      {/* Name label */}
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

      {/* Status label */}
      <Text
        position={[0, LABEL_Y - 0.2, 0]}
        fontSize={0.095}
        color={statusColor}
        anchorX="center"
        anchorY="bottom"
      >
        {STATUS_LABELS[session.status] || session.status}
      </Text>

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
