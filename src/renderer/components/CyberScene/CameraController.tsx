import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BASE_POSITION = new THREE.Vector3(0, 5, 7);
const LERP_FACTOR = 0.03;
const OFFSET_RANGE = 0.3;

export const CameraController: React.FC = () => {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef(new THREE.Vector3().copy(BASE_POSITION));

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1..1
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    target.current.set(
      BASE_POSITION.x + mouse.current.x * OFFSET_RANGE,
      BASE_POSITION.y - mouse.current.y * OFFSET_RANGE * 0.5,
      BASE_POSITION.z
    );

    camera.position.lerp(target.current, LERP_FACTOR);
    camera.lookAt(0, 0.3, 0);
  });

  return null;
};
