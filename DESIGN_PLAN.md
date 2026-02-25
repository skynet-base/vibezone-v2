# VibeZone v2 — Design Level-Up Plan

## Vision
Transform the Nodes/Infrastructure view from flat technical cards into an immersive 3D command center where each PC is represented as a realistic 3D device model. When agents run skills or subagents spawn, their activity is visualized live in the 3D scene.

## Design Direction
- **3D Style:** Sketchfab Realistic — procedural device models (tower, laptop, server rack)
- **UX Mix:** Gaming Dashboard + Mission Control + Cyberpunk HUD
- **Info Density:** Full detail, progressively disclosed
- **Agent Viz:** Running agents/subagents visible as energy particles and connection lines

## Architecture

### New Components

```
src/renderer/components/Nodes/
├── NodesView.tsx              ← EXISTING (updated)
├── NodeCard.tsx               ← EXTRACT from NodesView (modular)
├── Node3DScene.tsx            ← NEW: Three.js canvas for infrastructure
├── DeviceModel.tsx            ← NEW: Per-device 3D model (tower/laptop/server)
├── NodeMeshNetwork.tsx        ← NEW: Tailscale mesh visualization (connection lines)
├── NodeAgentActivity.tsx      ← NEW: Agent/skill particles on devices
├── NodeInfoPanel.tsx          ← NEW: Slide-out detail panel
└── NodeQuickActions.tsx       ← EXTRACT from NodesView (modular)
```

### Phase 1: Modular Refactor (Code Split)
Extract from the monolithic NodesView:
1. `NodeCard.tsx` — Single node card component
2. `NodeQuickActions.tsx` — Quick action buttons section
3. `NodeInfoPanel.tsx` — Expandable detail panel

### Phase 2: 3D Device Models (Procedural)
Create `DeviceModel.tsx` with procedural Three.js geometries:

**Tower PC (PC1 Master / PC2 Skynet):**
- Box geometry tower case + front panel details
- LED indicators (online=green glow, offline=red)
- Floating holographic label

**Laptop (PC4):**
- Hinged screen + keyboard base
- Screen shows mini status readout
- Lid angle animates on hover

**Server Rack (VPS):**
- Rack unit with blinking drive LEDs
- Status bars as geometry strips
- Subtle fan rotation animation

Each device:
- Emits colored point light matching node.color
- Pulses when online, dims when offline
- Shows neon outline matching connection status
- Rotates slowly on hover (OrbitControls per-object)

### Phase 3: Node3DScene
Full infrastructure 3D scene:
- Platform grid floor (reuse existing shader)
- 4 devices positioned in diamond/arc formation
- Tailscale mesh network lines between devices (animated dashes)
- Fog + post-processing (bloom, chromatic aberration)
- Camera: orbital with mouse parallax

### Phase 4: Agent Activity Visualization
When agents are running on a node:
- Energy orbs orbit around the device
- Skill particles flow between master → worker nodes
- Subagent spawns create mini-explosion effect
- Running task count shown as holographic badge

### Phase 5: Layout Integration
NodesView splits into two modes:
1. **3D View** (default): Full-screen Node3DScene + floating info panels
2. **Grid View** (toggle): Current card-based grid (improved)

Bottom dock: Quick actions, command input, status summary

## GLTF Model Integration (Future)
When user downloads Sketchfab models:
1. Place .glb files in `public/models/`
2. `DeviceModel.tsx` auto-detects: if GLB exists → useGLTF, else → procedural
3. Recommended models:
   - Desktop Tower: search "gaming pc tower" on sketchfab.com/tags/computer
   - Laptop: search "laptop" on sketchfab.com/tags/laptop
   - Server Rack: search "server rack" on sketchfab.com/tags/servers

## Design Tokens (Extending Existing)

```css
/* New node-specific tokens */
--node-tower-accent: #00ccff;
--node-laptop-accent: #ec4899;
--node-server-accent: #00ff88;
--node-skynet-accent: #f59e0b;

/* 3D scene */
--scene-bg: #050508;
--scene-fog: #050508;
--scene-grid: #00ccff;
```

## Quality Tiers
- **Low:** No 3D scene, card grid only
- **Medium:** 3D scene with simple geometries, no post-processing
- **High:** Full 3D scene, post-processing, particle effects, shadows

## Non-Technical User Considerations
- Hover tooltip on each device explaining what it does
- Color-coded status: green=online, red=offline, amber=connecting
- "What's happening" summary in plain language
- Click device → slide-out panel with details
- No terminal jargon in the default view
