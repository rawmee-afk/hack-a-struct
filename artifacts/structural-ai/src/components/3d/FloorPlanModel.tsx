import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeDModel, WallSegment, Room } from '@workspace/api-client-react';

interface FloorPlanModelProps {
  model: ThreeDModel;
  rooms?: Room[];
}

// ─── Room floor colour map ────────────────────────────────────────────────────

const ROOM_COLORS: Record<string, string> = {
  'Living Room':    '#1e3a5f',
  'Master Bedroom': '#1e2d4a',
  'Bedroom':        '#1e2d4a',
  'Bedroom 2':      '#192540',
  'Bedroom 3':      '#192540',
  'Kitchen':        '#1a2e20',
  'Bathroom':       '#0f2030',
  'Bathroom 2':     '#0f2030',
  'Foyer':          '#25183a',
  'Dining Room':    '#1a2b18',
  'Study':          '#1a2535',
  'Laundry':        '#18252e',
  'Storage':        '#18181e',
  'Garage':         '#1c1c26',
  'Balcony':        '#182030',
  'Staircase':      '#222232',
};
const DEFAULT_ROOM_COLOR = '#1e293b';

// ─── Room floor panel ─────────────────────────────────────────────────────────

function RoomFloor({ cx, cz, size, color }: { cx: number; cz: number; size: number; color: string }) {
  return (
    <mesh position={[cx, 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size * 0.88, size * 0.88]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} transparent opacity={0.72} />
    </mesh>
  );
}

// ─── Room label ───────────────────────────────────────────────────────────────

function RoomLabel({ cx, cz, label }: { cx: number; cz: number; label: string }) {
  return (
    <Html position={[cx, 0.12, cz]} center zIndexRange={[10, 20]} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontSize: '8px', fontFamily: 'monospace', fontWeight: 700,
        letterSpacing: '0.09em', color: 'rgba(148,163,184,0.7)',
        whiteSpace: 'nowrap', textTransform: 'uppercase', userSelect: 'none',
      }}>
        {label}
      </div>
    </Html>
  );
}

// ─── Extruded wall ────────────────────────────────────────────────────────────

function Wall({ segment, height }: { segment: WallSegment; height: number }) {
  const { length, centerX, centerZ, rotationY, isLB } = useMemo(() => {
    const dx = segment.x2 - segment.x1;
    const dz = segment.y2 - segment.y1;
    return {
      length:  segment.length || Math.hypot(dx, dz),
      centerX: (segment.x1 + segment.x2) / 2,
      centerZ: (segment.y1 + segment.y2) / 2,
      rotationY: -Math.atan2(dz, dx),
      isLB: segment.wallType === 'load_bearing',
    };
  }, [segment]);

  return (
    <mesh position={[centerX, height / 2, centerZ]} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, height, Math.max(segment.thickness, 0.06)]} />
      <meshStandardMaterial
        color={isLB ? '#38bdf8' : '#64748b'}
        emissive={isLB ? '#0c4a6e' : '#1e293b'}
        emissiveIntensity={isLB ? 0.35 : 0.15}
        roughness={0.18}
        metalness={0.72}
        transparent
        opacity={isLB ? 0.96 : 0.85}
      />
    </mesh>
  );
}

// ─── Floor slab ───────────────────────────────────────────────────────────────

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
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[polygon ? 0 : width / 2, -0.015, polygon ? 0 : height / 2]} receiveShadow>
      <meshStandardMaterial color="#0a1525" roughness={0.92} metalness={0.08} />
    </mesh>
  );
}

// ─── Ceiling ─────────────────────────────────────────────────────────────────

function Ceiling({ polygon, width, height, wallHeight }: {
  polygon?: [number, number][] | null; width: number; height: number; wallHeight: number
}) {
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
    <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}
      position={[polygon ? 0 : width / 2, wallHeight, polygon ? 0 : height / 2]}>
      <meshStandardMaterial color="#0d1a2a" roughness={0.95} transparent opacity={0.28} side={THREE.BackSide} />
    </mesh>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FloorPlanModel({ model, rooms = [] }: FloorPlanModelProps) {
  const cx          = model.floorWidth  / 2;
  const cz          = model.floorHeight / 2;
  const maxDim      = Math.max(model.floorWidth, model.floorHeight);
  const wallHeight  = model.wallHeight ?? 3.0;
  const lbCount     = model.walls.filter(w => w.wallType === 'load_bearing').length;
  const ptCount     = model.walls.filter(w => w.wallType === 'partition').length;

  return (
    <div className="w-full h-[540px] rounded-xl overflow-hidden glass-panel border-primary/20 relative">

      {/* Status bar */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono text-primary font-medium">3D_MODEL</span>
        </div>
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground">
          <span className="text-cyan-400">■</span> {lbCount} LB &nbsp;
          <span className="text-slate-500">■</span> {ptCount} PT
        </div>
      </div>

      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [cx, maxDim * 0.95, cz + maxDim * 0.85], fov: 42 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#060c18']} />
        <fog attach="fog" args={['#060c18', maxDim * 2.5, maxDim * 5]} />

        {/* Lighting */}
        <ambientLight intensity={0.22} color="#7ab4d8" />
        <directionalLight castShadow
          position={[maxDim * 0.9, maxDim * 1.1, maxDim * 0.6]}
          intensity={1.5} color="#deeeff"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5} shadow-camera-far={maxDim * 6}
          shadow-camera-left={-maxDim * 1.8} shadow-camera-right={maxDim * 1.8}
          shadow-camera-top={maxDim * 1.8} shadow-camera-bottom={-maxDim * 1.8}
        />
        <directionalLight position={[-maxDim * 0.4, maxDim * 0.5, -maxDim * 0.3]} intensity={0.3} color="#9bbfe0" />
        {/* Warm fill from below */}
        <pointLight position={[cx, 0.5, cz]} intensity={0.4} color="#ffeedd" distance={maxDim * 2} decay={2} />

        <Environment preset="city" />

        <Bounds fit clip observe margin={1.35}>
          <group position={[-cx, 0, -cz]}>

            <FloorSlab polygon={model.floorPolygon} width={model.floorWidth} height={model.floorHeight} />
            <Ceiling polygon={model.floorPolygon} width={model.floorWidth} height={model.floorHeight} wallHeight={wallHeight} />

            {/* Soft contact shadows on the floor */}
            <ContactShadows
              position={[cx, 0.002, cz]}
              width={model.floorWidth * 1.1}
              height={model.floorHeight * 1.1}
              opacity={0.55}
              blur={1.8}
              far={wallHeight + 0.5}
              color="#000820"
            />

            {/* Colored room floors */}
            {rooms.map((room, i) => (
              <RoomFloor
                key={i}
                cx={room.centroidX}
                cz={room.centroidY}
                size={Math.sqrt(room.area) * 0.9}
                color={ROOM_COLORS[room.label] ?? DEFAULT_ROOM_COLOR}
              />
            ))}

            {/* Room labels */}
            {rooms.map((room, i) => (
              <RoomLabel key={`l${i}`} cx={room.centroidX} cz={room.centroidY} label={room.label} />
            ))}

            {/* Walls */}
            {model.walls.map((w, i) => (
              <Wall key={i} segment={w} height={wallHeight} />
            ))}

          </group>
        </Bounds>

        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.03}
          enableDamping dampingFactor={0.06} minDistance={2} maxDistance={maxDim * 3} />
      </Canvas>

      {/* Bottom-right info */}
      <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur px-3 py-2 rounded-md border border-border text-xs font-mono text-muted-foreground flex flex-col gap-0.5">
        <p>H: <span className="text-white">{wallHeight.toFixed(1)} m</span></p>
        <p>{model.floorWidth.toFixed(1)} × {model.floorHeight.toFixed(1)} m</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur px-3 py-2 rounded-md border border-border text-xs font-mono flex flex-col gap-0.5">
        <p><span className="text-cyan-400">■</span> Load-bearing</p>
        <p><span className="text-slate-500">■</span> Partition</p>
      </div>
    </div>
  );
}
