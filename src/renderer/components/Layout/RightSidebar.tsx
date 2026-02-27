import React, { Suspense } from 'react';
import { CompactScene } from '../RightSidebar/CompactScene';
import { TaskQueuePanel } from '../RightSidebar/TaskQueuePanel';
import { PCHealthMini } from '../RightSidebar/PCHealthMini';

export const RightSidebar: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-vz-bg overflow-hidden">
      {/* 3D Scene */}
      <div className="flex-shrink-0 relative border-b border-vz-border/40" style={{ height: 220 }}>
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #020205, transparent)' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #020205 20%, transparent)' }} />

        <Suspense fallback={<div className="w-full h-full bg-vz-bg" />}>
          <CompactScene />
        </Suspense>
      </div>

      {/* Task Queue */}
      <div className="flex-1 min-h-0 overflow-hidden border-b border-vz-border/40 flex flex-col">
        <div className="px-3 py-1.5 border-b border-vz-border/30 flex-shrink-0">
          <span className="text-[9px] font-mono text-vz-muted uppercase tracking-widest">
            Görev Kuyruğu
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <TaskQueuePanel />
        </div>
      </div>

      {/* PC Health */}
      <div className="flex-shrink-0 border-t border-vz-border/40" style={{ height: 80 }}>
        <div className="px-3 py-1 border-b border-vz-border/30">
          <span className="text-[9px] font-mono text-vz-muted uppercase tracking-widest">PC Sağlık</span>
        </div>
        <PCHealthMini />
      </div>
    </div>
  );
};
