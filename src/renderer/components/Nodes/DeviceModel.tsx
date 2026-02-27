import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { NodeId, NodeConnectionStatus } from '@shared/types';
import { NodeAgentActivity } from './NodeAgentActivity';
import { ErrorBoundary3D } from '../UI/ErrorBoundary3D';

// GLTF model paths — auto-detect: if file exists, use it; otherwise procedural
const GLTF_PATHS: Record<string, string> = {
  tower: '/models/tower.glb',
  laptop: '/models/laptop.glb',
  server: '/models/server.glb',
};

// Removed unreliable fetch check for file protocol in Electron. 
// Defaulting to procedural models for stability until a local asset loader is properly configured.
function useModelAvailable(deviceType: string): boolean {
  return false;
}

// GLTF model wrapper
const GLTFModel: React.FC<{ path: string; color: string; online: boolean }> = ({ path, color, online }) => {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = new THREE.MeshStandardMaterial({
          color: '#1a1a2e',
          metalness: 0.8,
          roughness: 0.3,
          emissive: color,
          emissiveIntensity: online ? 0.15 : 0.02,
        });
        mesh.material = mat;
        mesh.castShadow = true;
      }
    });
    return c;
  }, [scene, color, online]);

  return <primitive object={cloned} scale={0.8} />;
};

interface DeviceModelProps {
  nodeId: NodeId;
  name: string;
  color: string;
  connection: NodeConnectionStatus;
  deviceType: 'tower' | 'laptop' | 'server';
  position: [number, number, number];
  ramPercent?: number;
  activeAgents?: number;
  onClick?: () => void;
}

// Tower PC (PC1, PC2)
const TowerCase: React.FC<{ color: string; online: boolean }> = ({ color, online }) => {
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const t = clock.getElapsedTime();
      glowRef.current.intensity = online
        ? 1.5 + Math.sin(t * 3) * 0.5
        : 0.2;
    }
  });

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a2e',
    metalness: 0.8,
    roughness: 0.3,
  }), []);

  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: online ? 0.6 : 0.1,
    metalness: 0.9,
    roughness: 0.2,
  }), [color, online]);

  return (
    <group>
      {/* Main case body */}
      <mesh material={mat} castShadow>
        <boxGeometry args={[0.8, 1.4, 0.6]} />
      </mesh>

      {/* Front panel accent strip */}
      <mesh position={[-0.401, 0, 0]} material={accentMat}>
        <boxGeometry args={[0.02, 1.2, 0.5]} />
      </mesh>

      {/* Power LED */}
      <mesh position={[-0.41, 0.5, 0.15]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial
          color={online ? '#00ff88' : '#ff2a2a'}
          emissive={online ? '#00ff88' : '#ff2a2a'}
          emissiveIntensity={online ? 2 : 0.3}
        />
      </mesh>

      {/* Drive bay lines */}
      {[-0.1, 0, 0.1].map((y, i) => (
        <mesh key={i} position={[-0.41, y, 0]}>
          <boxGeometry args={[0.01, 0.06, 0.35]} />
          <meshStandardMaterial color="#2a2a40" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* Top vent */}
      <mesh position={[0, 0.71, 0]}>
        <boxGeometry args={[0.6, 0.02, 0.4]} />
        <meshStandardMaterial color="#0f0f1a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Glow light */}
      <pointLight
        ref={glowRef}
        position={[-0.5, 0, 0]}
        color={color}
        intensity={online ? 1.5 : 0.2}
        distance={3}
        decay={2}
      />
    </group>
  );
};

// Laptop (PC4)
const LaptopModel: React.FC<{ color: string; online: boolean }> = ({ color, online }) => {
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const t = clock.getElapsedTime();
      glowRef.current.intensity = online
        ? 1.2 + Math.sin(t * 3) * 0.3
        : 0.1;
    }
  });

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a2e',
    metalness: 0.85,
    roughness: 0.25,
  }), []);

  const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: online ? '#0a0a14' : '#050508',
    emissive: online ? color : '#000000',
    emissiveIntensity: online ? 0.15 : 0,
  }), [color, online]);

  return (
    <group>
      {/* Base / Keyboard */}
      <mesh material={bodyMat} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.06, 0.8]} />
      </mesh>

      {/* Trackpad */}
      <mesh position={[0, 0.031, 0.15]}>
        <boxGeometry args={[0.35, 0.005, 0.25]} />
        <meshStandardMaterial color="#2a2a40" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Screen (tilted) */}
      <group position={[0, 0.45, -0.38]} rotation={[-0.3, 0, 0]}>
        <mesh material={bodyMat}>
          <boxGeometry args={[1.15, 0.75, 0.03]} />
        </mesh>
        {/* Screen surface */}
        <mesh position={[0, 0, 0.016]} material={screenMat}>
          <planeGeometry args={[1.0, 0.6]} />
        </mesh>
        {/* Screen accent line */}
        <mesh position={[0, -0.34, 0.016]}>
          <boxGeometry args={[0.3, 0.01, 0.001]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={online ? 1 : 0.1}
          />
        </mesh>
      </group>

      {/* Glow */}
      <pointLight
        ref={glowRef}
        position={[0, 0.6, -0.2]}
        color={color}
        intensity={online ? 1.2 : 0.1}
        distance={3}
        decay={2}
      />
    </group>
  );
};

// Server Rack (VPS)
const ServerRack: React.FC<{ color: string; online: boolean }> = ({ color, online }) => {
  const ledsRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      glowRef.current.intensity = online
        ? 1.0 + Math.sin(t * 5) * 0.4
        : 0.1;
    }
    // Blink drive LEDs
    if (ledsRef.current && online) {
      ledsRef.current.children.forEach((led, i) => {
        const mesh = led as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const blink = Math.sin(t * 10 + i * 1.5) > 0.3;
        mat.emissiveIntensity = blink ? 1.5 : 0.2;
      });
    }
  });

  const rackMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#12121f',
    metalness: 0.9,
    roughness: 0.2,
  }), []);

  return (
    <group>
      {/* Main rack body */}
      <mesh material={rackMat} castShadow>
        <boxGeometry args={[1.0, 1.6, 0.5]} />
      </mesh>

      {/* Rack units (4 units) */}
      {[0.5, 0.15, -0.2, -0.55].map((y, i) => (
        <group key={i}>
          {/* Unit face */}
          <mesh position={[-0.501, y, 0]}>
            <boxGeometry args={[0.01, 0.28, 0.42]} />
            <meshStandardMaterial color="#1a1a30" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Unit handle */}
          <mesh position={[-0.52, y, 0]}>
            <boxGeometry args={[0.02, 0.04, 0.3]} />
            <meshStandardMaterial color="#2a2a45" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Drive activity LEDs */}
      <group ref={ledsRef}>
        {[0.5, 0.15, -0.2, -0.55].map((y, i) => (
          <mesh key={i} position={[-0.53, y + 0.1, 0.15]}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshStandardMaterial
              color={online ? color : '#333'}
              emissive={online ? color : '#111'}
              emissiveIntensity={online ? 1.5 : 0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Side accent strip */}
      <mesh position={[0, 0, 0.251]}>
        <boxGeometry args={[0.9, 1.5, 0.01]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={online ? 0.15 : 0.02}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Glow */}
      <pointLight
        ref={glowRef}
        position={[-0.6, 0, 0]}
        color={color}
        intensity={online ? 1.0 : 0.1}
        distance={3}
        decay={2}
      />
    </group>
  );
};

// RAM bar as 3D holographic ring
const RamRing: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.y += 0.005;
    }
  });

  const ringColor = percent > 85 ? '#ff2a2a' : percent > 60 ? '#f59e0b' : color;

  return (
    <group position={[0, -0.9, 0]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32, 1, 0, (percent / 100) * Math.PI * 2]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Background ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Main DeviceModel component
export const DeviceModel: React.FC<DeviceModelProps> = ({
  nodeId: _nodeId,
  name,
  color,
  connection,
  deviceType,
  position,
  ramPercent,
  activeAgents = 0,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const online = connection === 'online';
  const connecting = connection === 'connecting';
  const hasGLTF = useModelAvailable(deviceType);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    // Slow idle rotation
    groupRef.current.rotation.y += delta * 0.1;
    // Connecting pulse scale
    if (connecting) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.05;
      groupRef.current.scale.setScalar(scale);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={online ? 0.15 : 0}>
        <group
          ref={groupRef}
          onClick={onClick}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* GLTF auto-detect: use downloaded model if available, else procedural */}
          {hasGLTF ? (
            <GLTFModel path={GLTF_PATHS[deviceType]} color={color} online={online} />
          ) : (
            <>
              {deviceType === 'tower' && <TowerCase color={color} online={online} />}
              {deviceType === 'laptop' && <LaptopModel color={color} online={online} />}
              {deviceType === 'server' && <ServerRack color={color} online={online} />}
            </>
          )}

          {/* RAM ring */}
          {ramPercent !== undefined && online && (
            <RamRing percent={ramPercent} color={color} />
          )}

          {/* Holographic name label */}
          <ErrorBoundary3D>
            <Text
              position={[0, 1.2, 0]}
              fontSize={0.18}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.005}
              outlineColor="#000000"
            >
              {name.toUpperCase()}
            </Text>

            {/* Status badge */}
            <Text
              position={[0, 1.0, 0]}
              fontSize={0.1}
              color={online ? '#00ff88' : connecting ? '#f59e0b' : '#ff2a2a'}
              anchorX="center"
              anchorY="middle"
            >
              {online ? 'ONLINE' : connecting ? 'CONNECTING...' : 'OFFLINE'}
            </Text>
          </ErrorBoundary3D>

          {/* Agent activity visualization */}
          <NodeAgentActivity
            activeCount={activeAgents}
            color={color}
            online={online}
          />

          {/* Base glow disc */}
          <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.7, 32]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={online ? (hovered ? 0.45 : 0.3) : 0.05}
              transparent
              opacity={hovered ? 0.24 : 0.15}
            />
          </mesh>
        </group>
      </Float>
    </group>
  );
};
