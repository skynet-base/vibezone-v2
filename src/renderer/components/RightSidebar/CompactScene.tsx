import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSessionStore } from '../../hooks/useSessionStore';
import { ChibiRobot } from './ChibiRobot';
import { ScenePlatform } from './ScenePlatform';
import type { AgentType, SessionStatus } from '@shared/types';

const AGENT_POSITIONS: [number, number, number][] = [
  [0, 0, 0.9],
  [-0.9, 0, 0],
  [0.9, 0, 0],
  [0, 0, -0.9],
  [-0.65, 0, 0.65],
  [0.65, 0, 0.65],
  [-0.65, 0, -0.65],
  [0.65, 0, -0.65],
];

interface AgentEntry {
  id: string;
  agentType: AgentType;
  status: SessionStatus;
  name: string;
  nodeId?: string;
}

export const CompactScene: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const detectedAgents = useSessionStore((s) => s.detectedAgents);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  const allAgents = useMemo<AgentEntry[]>(() => {
    const local: AgentEntry[] = sessions.map((s) => ({
      id: s.id,
      agentType: s.agentType,
      status: s.status,
      name: s.name,
      nodeId: undefined,
    }));

    const remote: AgentEntry[] = [];
    detectedAgents.forEach((agents, nodeId) => {
      agents.forEach((a) => {
        const isDuplicate = local.some((l) => l.agentType === a.agentType);
        if (!isDuplicate) {
          remote.push({
            id: `${nodeId}-${a.pid}`,
            agentType: a.agentType,
            status: 'working',
            name: `${a.agentType} (${nodeId})`,
            nodeId,
          });
        }
      });
    });

    return [...local, ...remote].slice(0, 8);
  }, [sessions, detectedAgents]);

  const sortedAgents = useMemo(() => {
    return [...allAgents].sort((a, b) => {
      if (a.status === 'working' && b.status !== 'working') return -1;
      if (b.status === 'working' && a.status !== 'working') return 1;
      return 0;
    });
  }, [allAgents]);

  if (allAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-vz-muted/20 text-xs font-mono text-center px-4 leading-relaxed">
          Terminal'den bir arac baslatin
        </div>
      </div>
    );
  }

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
      style={{ background: '#020205' }}
    >
      <PerspectiveCamera makeDefault position={[0, 3.5, 5]} fov={48} near={0.1} far={50} />
      <fog attach="fog" args={['#020205', 7, 16]} />

      <ambientLight intensity={0.08} color="#1A1A3A" />
      <directionalLight position={[3, 5, 3]} intensity={0.35} color="#8888CC" />

      <ScenePlatform />

      {sortedAgents.map((agent, i) => (
        <ChibiRobot
          key={agent.id}
          agentType={agent.agentType}
          status={agent.status}
          name={agent.name}
          nodeId={agent.nodeId}
          position={AGENT_POSITIONS[i] || [0, 0, 0]}
          isActive={agent.id === activeSessionId}
          onClick={() => {
            if (!agent.nodeId) setActiveSession(agent.id);
          }}
        />
      ))}

      <EffectComposer>
        <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.9} intensity={0.9} />
      </EffectComposer>
    </Canvas>
  );
};
