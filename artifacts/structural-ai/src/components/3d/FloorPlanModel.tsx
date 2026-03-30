import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeDModel, WallSegment, Room } from '@workspace/api-client-react';

interface FloorPlanModelProps {
  model: ThreeDModel;
  rooms?: Room[];
}

// ── Snap wall angle to nearest 15° so walls are perfectly straight ────────────
function snapAngle(rad: number): number {
  const step = Math.PI / 12; // 15°
  const snapped = Math.round(rad / step) * step;
  return Math.abs(rad - snapped) < 0.12 ? snapped : rad;
}

// ── Room colour palette (soothing pastels on dark bg) ────────────────────────
const ROOM_TINTS: Record<string, string> = {
  'Living Room':    '#1d3461',
  'Master Bedroom': '#2d1b4e',
  'Bedroom':        '#2d1b4e',
  'Bedroom 2':      '#2a1a45',
  'Bedroom 3':      '#271842',
  'Kitchen':        '#14352a',
  'Bathroom':       '#0e2f3a',
  'Bathroom 2':     '#0e2f3a',
  'Foyer':          '#2a1f3d',
  'Dining Room':    '#1a3020',
  'Study':          '#1f2d4a',
  'Laundry':        '#162530',
  'Storage':        '#1c1c28',
  'Garage':         '#1f1f2c',
  'Balcony':        '#12253a',
  'Staircase':      '#20203a',
};
const DEFAULT_TINT = '#1a2232';

// 2D colour palette (light)
const ROOM_2D: Record<string, string> = {
  'Living Room':    '#dbeafe',
  'Master Bedroom': '#ede9fe',
  'Bedroom':        '#ede9fe',
  'Bedroom 2':      '#e8e4fc',
  'Bedroom 3':      '#e4dffa',
  'Kitchen':        '#dcfce7',
  'Bathroom':       '#cffafe',
  'Bathroom 2':     '#caf0f8',
  'Foyer':          '#f5f5f4',
  'Dining Room':    '#fef9c3',
  'Study':          '#fce7f3',
  'Laundry':        '#e0f2fe',
  'Storage':        '#f1f5f9',
  'Garage':         '#f3f4f6',
  'Balcony':        '#ecfdf5',
  'Staircase':      '#fafaf8',
};

// ── 3D room floor tile ────────────────────────────────────────────────────────
function RoomFloor({ cx, cz, size, color }: { cx: number; cz: number; size: number; color: string }) {
  return (
    <mesh position={[cx, 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size * 0.86, size * 0.86]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.0} transparent opacity={0.55} />
    </mesh>
  );
}

// ── Wall with snapped angle for clean straight lines ─────────────────────────
function Wall({ segment, height }: { segment: WallSegment; height: number }) {
  const { length, centerX, centerZ, rotationY, isLB } = useMemo(() => {
    const dx = segment.x2 - segment.x1;
    const dz = segment.y2 - segment.y1;
    const rawAngle = -Math.atan2(dz, dx);
    return {
      length:   segment.length ?? Math.hypot(dx, dz),
      centerX:  (segment.x1 + segment.x2) / 2,
      centerZ:  (segment.y1 + segment.y2) / 2,
      rotationY: snapAngle(rawAngle),
      isLB:     segment.wallType === 'load_bearing',
    };
  }, [segment]);

  const thickness = Math.max(segment.thickness ?? 0.12, 0.09);

  return (
    <mesh
      position={[centerX, height / 2, centerZ]}
      rotation={[0, rotationY, 0]}
      castShadow receiveShadow
    >
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial
        color={isLB ? '#f0c060' : '#dce8f5'}
        emissive={isLB ? '#3d2a00' : '#0a1828'}
        emissiveIntensity={isLB ? 0.18 : 0.06}
        roughness={isLB ? 0.28 : 0.22}
        metalness={isLB ? 0.08 : 0.04}
        transparent
        opacity={isLB ? 0.98 : 0.92}
      />
    </mesh>
  );
}

// ── Floor slab ────────────────────────────────────────────────────────────────
function FloorSlab({ polygon, width, height }: { polygon?: [number, number][] | null; width: number; height: number }) {
  const geometry = useMemo(() => {
    if (polygon && polygon.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(polygon[0][0], polygon[0][1]);
      for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i][0], polygon[i][1]);
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    }
    return new THREE.PlaneGeometry(width, height);
  }, [polygon, width, height]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[polygon ? 0 : width / 2, -0.01, polygon ? 0 : height / 2]}
      receiveShadow
    >
      <meshStandardMaterial color="#12202e" roughness={0.85} metalness={0.04} />
    </mesh>
  );
}

// ── Snap a 2D wall segment to nearest H/V axis if within threshold ────────────
function snap2DWall(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const ratio = 0.2; // within 20% → snap
  if (dy < dx * ratio) {
    const my = (y1 + y2) / 2;
    return { x1, y1: my, x2, y2: my };      // horizontal
  }
  if (dx < dy * ratio) {
    const mx = (x1 + x2) / 2;
    return { x1: mx, y1, x2: mx, y2 };      // vertical
  }
  return { x1, y1, x2, y2 };                // diagonal — keep
}

// ── 2D SVG floor plan ─────────────────────────────────────────────────────────
function FloorPlan2D({ model, rooms }: { model: ThreeDModel; rooms: Room[] }) {
  const PAD  = 48;
  const W    = 660;
  const H    = 520;
  const scaleX = (W - PAD * 2) / model.floorWidth;
  const scaleY = (H - PAD * 2) / model.floorHeight;
  const sc   = Math.min(scaleX, scaleY);
  const offX = PAD + (W - PAD * 2 - model.floorWidth  * sc) / 2;
  const offY = PAD + (H - PAD * 2 - model.floorHeight * sc) / 2;

  const tx = (x: number) => offX + x * sc;
  const ty = (y: number) => offY + y * sc;

  // Snap all walls
  const snappedWalls = model.walls.map(w => ({
    ...w,
    ...snap2DWall(w.x1, w.y1, w.x2, w.y2),
  }));

  // Scale bar length: find a nice number ~10% of floor width
  const barMeters = Math.round(model.floorWidth * 0.15) || 1;
  const barPx     = barMeters * sc;
  const barX      = offX;
  const barY      = H - 18;

  return (
    <div className="w-full h-[540px] rounded-xl overflow-hidden border border-border relative bg-white flex items-center justify-center">
      <svg width={W} height={H} style={{ fontFamily: 'ui-monospace, monospace' }}>
        <defs>
          {/* Subtle grid pattern */}
          <pattern id="grid2d" width={sc} height={sc} patternUnits="userSpaceOnUse"
            x={offX} y={offY}>
            <path d={`M ${sc} 0 L 0 0 0 ${sc}`} fill="none" stroke="#e8eaed" strokeWidth="0.5" />
          </pattern>
          {/* Load-bearing hatch */}
          <pattern id="lbhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#92400e" strokeWidth="2.5" />
          </pattern>
        </defs>

        {/* White page background */}
        <rect width={W} height={H} fill="white" />

        {/* Grid */}
        <rect x={offX} y={offY}
          width={model.floorWidth * sc} height={model.floorHeight * sc}
          fill="url(#grid2d)"
        />

        {/* Floor outline */}
        <rect
          x={offX} y={offY}
          width={model.floorWidth * sc} height={model.floorHeight * sc}
          fill="#f9fafb" stroke="#94a3b8" strokeWidth={1}
        />

        {/* ── Room fills ──────────────────────────────────────────────── */}
        {rooms.map((room, i) => {
          const side = Math.sqrt(room.area) * sc * 0.84;
          const rx   = tx(room.centroidX) - side / 2;
          const ry   = ty(room.centroidY) - side / 2;
          const fill = ROOM_2D[room.label] ?? '#eef1f5';
          return (
            <g key={i}>
              <rect x={rx} y={ry} width={side} height={side} rx={2}
                fill={fill} stroke={fill} strokeWidth={0} opacity={0.85}
              />
            </g>
          );
        })}

        {/* ── Partition walls (draw first, under LB) ──────────────────── */}
        {snappedWalls.filter(w => w.wallType !== 'load_bearing').map((w, i) => (
          <line key={`pt-${i}`}
            x1={tx(w.x1)} y1={ty(w.y1)} x2={tx(w.x2)} y2={ty(w.y2)}
            stroke="#334155" strokeWidth={3}
            strokeLinecap="square" strokeLinejoin="miter"
          />
        ))}

        {/* ── Load-bearing walls (on top, thicker, darker) ─────────────── */}
        {snappedWalls.filter(w => w.wallType === 'load_bearing').map((w, i) => (
          <g key={`lb-${i}`}>
            {/* Solid dark fill */}
            <line
              x1={tx(w.x1)} y1={ty(w.y1)} x2={tx(w.x2)} y2={ty(w.y2)}
              stroke="#1c1917" strokeWidth={7}
              strokeLinecap="square"
            />
            {/* Amber highlight edge */}
            <line
              x1={tx(w.x1)} y1={ty(w.y1)} x2={tx(w.x2)} y2={ty(w.y2)}
              stroke="#d97706" strokeWidth={2}
              strokeLinecap="square" opacity={0.7}
              strokeDasharray="4 3"
            />
          </g>
        ))}

        {/* ── Room labels ──────────────────────────────────────────────── */}
        {rooms.map((room, i) => {
          const side = Math.sqrt(room.area) * sc;
          if (side < 32) return null;
          const fs = Math.min(10.5, side * 0.115);
          return (
            <g key={`lbl-${i}`}>
              {/* Shadow */}
              <text
                x={tx(room.centroidX) + 0.5} y={ty(room.centroidY) + 0.5}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fs} fill="rgba(0,0,0,0.15)" fontWeight="700"
              >
                {room.label.toUpperCase()}
              </text>
              {/* Label */}
              <text
                x={tx(room.centroidX)} y={ty(room.centroidY)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fs} fill="#1e293b" fontWeight="700"
                letterSpacing="0.04em"
              >
                {room.label.toUpperCase()}
              </text>
              {/* Area */}
              {side > 55 && (
                <text
                  x={tx(room.centroidX)} y={ty(room.centroidY) + fs + 3}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs * 0.75} fill="#64748b" fontWeight="400"
                >
                  {room.area.toFixed(1)} m²
                </text>
              )}
            </g>
          );
        })}

        {/* ── Scale bar ────────────────────────────────────────────────── */}
        <rect x={barX} y={barY - 5} width={barPx} height={6}
          fill="none" stroke="#64748b" strokeWidth={1.2} />
        <line x1={barX} y1={barY - 5} x2={barX} y2={barY + 5} stroke="#64748b" strokeWidth={1.2} />
        <line x1={barX + barPx} y1={barY - 5} x2={barX + barPx} y2={barY + 5} stroke="#64748b" strokeWidth={1.2} />
        <text x={barX + barPx / 2} y={barY - 9} textAnchor="middle" fontSize={8.5} fill="#64748b">
          {barMeters} m
        </text>

        {/* ── North indicator ──────────────────────────────────────────── */}
        <g transform={`translate(${W - 34}, 34)`}>
          <circle cx={0} cy={0} r={14} fill="white" stroke="#cbd5e1" strokeWidth={1} />
          <polygon points="0,-10 4,2 0,-1 -4,2" fill="#1e293b" />
          <polygon points="0,10 4,-2 0,1 -4,-2" fill="#94a3b8" />
          <text x={0} y={-14} textAnchor="middle" fontSize={8} fill="#334155" fontWeight="700">N</text>
        </g>

        {/* ── Title ────────────────────────────────────────────────────── */}
        <text x={W / 2} y={20} textAnchor="middle" fontSize={10} fill="#94a3b8" letterSpacing="0.12em">
          FLOOR PLAN  —  {model.floorWidth.toFixed(1)} × {model.floorHeight.toFixed(1)} m
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/95 shadow-sm border border-gray-100 px-3 py-2 rounded-lg text-[10.5px] font-mono flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-[7px] bg-[#1c1917] rounded-sm" />
          <span className="text-slate-600 tracking-wide">LOAD-BEARING</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-[3px] bg-[#334155] rounded-sm" />
          <span className="text-slate-600 tracking-wide">PARTITION</span>
        </div>
        <div className="pt-1 border-t border-gray-100 text-slate-400">
          {rooms.length} rooms · {model.walls.length} walls
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function FloorPlanModel({ model, rooms = [] }: FloorPlanModelProps) {
  const [view, setView] = useState<'3d' | '2d'>('3d');

  const cx         = model.floorWidth  / 2;
  const cz         = model.floorHeight / 2;
  const maxDim     = Math.max(model.floorWidth, model.floorHeight);
  const wallHeight = model.wallHeight ?? 3.0;
  const lbCount    = model.walls.filter(w => w.wallType === 'load_bearing').length;
  const ptCount    = model.walls.filter(w => w.wallType === 'partition').length;

  return (
    <div className="w-full h-[540px] rounded-xl overflow-hidden glass-panel border border-primary/20 relative">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <div className="bg-background/85 backdrop-blur px-3 py-1.5 rounded-lg border border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono text-primary font-semibold tracking-widest">
            {view === '3d' ? '3D_MODEL' : 'FLOOR_PLAN'}
          </span>
        </div>
        <div className="bg-background/85 backdrop-blur px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-muted-foreground">
          <span className="text-amber-400">■</span> {lbCount} LB &nbsp;
          <span className="text-slate-400">■</span> {ptCount} PT
        </div>
      </div>

      {/* ── 2D / 3D toggle ──────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-10 flex rounded-lg overflow-hidden border border-border bg-background/85 backdrop-blur">
        <button
          onClick={() => setView('2d')}
          className={`px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
            view === '2d'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          2D
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => setView('3d')}
          className={`px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
            view === '3d'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          3D
        </button>
      </div>

      {/* ── 2D view ─────────────────────────────────────────────────────── */}
      {view === '2d' && <FloorPlan2D model={model} rooms={rooms} />}

      {/* ── 3D view ─────────────────────────────────────────────────────── */}
      {view === '3d' && (
        <>
          <Canvas
            shadows={{ type: THREE.PCFShadowMap }}
            camera={{ position: [cx * 0.6, maxDim * 1.05, cz + maxDim * 0.95], fov: 38 }}
            dpr={[1, 2]}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          >
            <color attach="background" args={['#06101e']} />
            <fog attach="fog" args={['#06101e', maxDim * 3, maxDim * 6]} />

            {/* ── Lighting ────────────────────────────────────────────── */}
            {/* Soft ambient */}
            <ambientLight intensity={0.35} color="#c8dff0" />

            {/* Key light — warm architectural top-right */}
            <directionalLight
              castShadow
              position={[maxDim * 1.2, maxDim * 1.4, maxDim * 0.7]}
              intensity={2.2}
              color="#fff8f0"
              shadow-mapSize={[4096, 4096]}
              shadow-camera-near={0.5}
              shadow-camera-far={maxDim * 8}
              shadow-camera-left={-maxDim * 2}
              shadow-camera-right={maxDim * 2}
              shadow-camera-top={maxDim * 2}
              shadow-camera-bottom={-maxDim * 2}
              shadow-bias={-0.0004}
            />

            {/* Cool fill from left */}
            <directionalLight
              position={[-maxDim * 0.6, maxDim * 0.8, -maxDim * 0.4]}
              intensity={0.45}
              color="#a0c4e8"
            />

            {/* Subtle warm bounce from floor */}
            <pointLight
              position={[cx, 0.4, cz]}
              intensity={0.5}
              color="#ffe8c8"
              distance={maxDim * 2.5}
              decay={2}
            />

            {/* HDRI environment for reflections */}
            <Environment preset="warehouse" />

            <Bounds fit clip observe margin={1.3}>
              <group position={[-cx, 0, -cz]}>

                {/* Floor slab */}
                <FloorSlab
                  polygon={model.floorPolygon}
                  width={model.floorWidth}
                  height={model.floorHeight}
                />

                {/* Subtle floor grid */}
                <Grid
                  position={[cx, 0.001, cz]}
                  args={[model.floorWidth * 1.05, model.floorHeight * 1.05]}
                  cellSize={1}
                  cellThickness={0.4}
                  cellColor="#1e3050"
                  sectionSize={5}
                  sectionThickness={0.8}
                  sectionColor="#2a4070"
                  fadeDistance={maxDim * 2.5}
                  fadeStrength={1.2}
                  infiniteGrid={false}
                />

                {/* Soft contact shadows */}
                <ContactShadows
                  position={[cx, 0.003, cz]}
                  width={model.floorWidth * 1.15}
                  height={model.floorHeight * 1.15}
                  opacity={0.65}
                  blur={2.2}
                  far={wallHeight + 1}
                  color="#000a1e"
                />

                {/* Room floor tiles */}
                {rooms.map((room, i) => (
                  <RoomFloor
                    key={i}
                    cx={room.centroidX}
                    cz={room.centroidY}
                    size={Math.sqrt(room.area) * 0.88}
                    color={ROOM_TINTS[room.label] ?? DEFAULT_TINT}
                  />
                ))}

                {/* Walls */}
                {model.walls.map((w, i) => (
                  <Wall key={i} segment={w} height={wallHeight} />
                ))}

              </group>
            </Bounds>

            <OrbitControls
              makeDefault
              minPolarAngle={0}
              maxPolarAngle={Math.PI / 2 - 0.04}
              enableDamping
              dampingFactor={0.05}
              minDistance={2}
              maxDistance={maxDim * 3.5}
              rotateSpeed={0.7}
              zoomSpeed={0.9}
            />
          </Canvas>

          {/* Dimensions */}
          <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground flex flex-col gap-0.5">
            <p>H <span className="text-white">{wallHeight.toFixed(1)} m</span></p>
            <p>{model.floorWidth.toFixed(1)} × {model.floorHeight.toFixed(1)} m</p>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur px-3 py-2 rounded-lg border border-border text-xs font-mono flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-400 opacity-90" />
              <span className="text-muted-foreground">Load-bearing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-slate-300 opacity-70" />
              <span className="text-muted-foreground">Partition</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
