import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BASE_POSITION = new THREE.Vector3(0, 5, 7);
const INTRO_START = new THREE.Vector3(0, 8, 14);
const LERP_FACTOR = 0.03;
const OFFSET_RANGE = 0.3;
const INTRO_DURATION = 2.5;

export const CameraController: React.FC = () => {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef(new THREE.Vector3().copy(BASE_POSITION));
  const introRef = useRef({ active: true, elapsed: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1..1
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((_state, delta) => {
    // Intro dolly animation
    if (introRef.current.active) {
      introRef.current.elapsed += delta;
      const t = Math.min(introRef.current.elapsed / INTRO_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      camera.position.lerpVectors(INTRO_START, BASE_POSITION, eased);
      camera.lookAt(0, 0.3, 0);
      if (t >= 1) introRef.current.active = false;
      return; // skip mouse parallax during intro
    }

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
