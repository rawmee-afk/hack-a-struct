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

// ── 2D SVG floor plan ─────────────────────────────────────────────────────────
function FloorPlan2D({ model, rooms }: { model: ThreeDModel; rooms: Room[] }) {
  const PAD  = 28;
  const W    = 640;
  const H    = 500;
  const scaleX = (W - PAD * 2) / model.floorWidth;
  const scaleY = (H - PAD * 2) / model.floorHeight;
  const sc   = Math.min(scaleX, scaleY);
  const offX = PAD + (W - PAD * 2 - model.floorWidth  * sc) / 2;
  const offY = PAD + (H - PAD * 2 - model.floorHeight * sc) / 2;

  const tx = (x: number) => offX + x * sc;
  const ty = (y: number) => offY + y * sc;

  return (
    <div className="w-full h-[540px] rounded-xl overflow-hidden border border-border relative bg-[#f8f7f4] flex items-center justify-center">
      <svg width={W} height={H} fontFamily="'JetBrains Mono', monospace">

        {/* Room fills */}
        {rooms.map((room, i) => {
          const s = Math.sqrt(room.area) * sc * 0.88;
          return (
            <rect key={i}
              x={tx(room.centroidX) - s / 2}
              y={ty(room.centroidY) - s / 2}
              width={s} height={s} rx={3}
              fill={ROOM_2D[room.label] ?? '#eef0f4'}
              stroke="#c8d0dc" strokeWidth={0.8}
            />
          );
        })}

        {/* Walls */}
        {model.walls.map((w, i) => {
          const isLB = w.wallType === 'load_bearing';
          // Snap coordinates to look straighter in 2D too
          const x1 = tx(w.x1), y1 = ty(w.y1);
          const x2 = tx(w.x2), y2 = ty(w.y2);
          return (
            <line key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isLB ? '#b45309' : '#334155'}
              strokeWidth={isLB ? 4.5 : 2.8}
              strokeLinecap="square"
            />
          );
        })}

        {/* Room labels */}
        {rooms.map((room, i) => {
          const s = Math.sqrt(room.area) * sc;
          if (s < 28) return null;
          return (
            <text key={i}
              x={tx(room.centroidX)} y={ty(room.centroidY)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={Math.min(10, s * 0.13)}
              fill="#1e293b" fontWeight="700" letterSpacing="0.04em"
            >
              {room.label.toUpperCase()}
            </text>
          );
        })}

        {/* Dimensions */}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#64748b">
          {model.floorWidth.toFixed(1)} m × {model.floorHeight.toFixed(1)} m
        </text>

        {/* North indicator */}
        <text x={W - 20} y={22} textAnchor="middle" fontSize={11} fill="#64748b" fontWeight="700">N</text>
        <line x1={W - 20} y1={25} x2={W - 20} y2={34} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arr)" />
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-mono flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-1 rounded bg-[#b45309]" />
          <span className="text-slate-700">Load-bearing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5 rounded bg-[#334155]" />
          <span className="text-slate-700">Partition</span>
        </div>
      </div>

      {/* Scale */}
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-mono text-slate-600">
        {rooms.length} rooms · {model.walls.length} walls
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
            shadows={{ type: THREE.PCFSoftShadowMap }}
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
