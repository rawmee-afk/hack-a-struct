import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Bounds, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeDModel, WallSegment, Room } from '@workspace/api-client-react';

interface FloorPlanModelProps {
  model: ThreeDModel;
  rooms?: Room[];
}

// ─── Single extruded wall ──────────────────────────────────────────────────────

function Wall({ segment, height }: { segment: WallSegment; height: number }) {
  const { length, centerX, centerZ, rotationY, isLoadBearing } = useMemo(() => {
    const dx = segment.x2 - segment.x1;
    const dz = segment.y2 - segment.y1;
    return {
      length:        segment.length || Math.hypot(dx, dz),
      centerX:       (segment.x1 + segment.x2) / 2,
      centerZ:       (segment.y1 + segment.y2) / 2,
      rotationY:     -Math.atan2(dz, dx),
      isLoadBearing: segment.wallType === 'load_bearing',
    };
  }, [segment]);

  return (
    <mesh
      position={[centerX, height / 2, centerZ]}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, height, Math.max(segment.thickness, 0.06)]} />
      <meshStandardMaterial
        color={isLoadBearing ? '#38bdf8' : '#64748b'}
        emissive={isLoadBearing ? '#0c4a6e' : '#1e293b'}
        emissiveIntensity={0.25}
        roughness={0.2}
        metalness={0.7}
        transparent
        opacity={isLoadBearing ? 0.95 : 0.85}
      />
    </mesh>
  );
}

// ─── Floor slab ────────────────────────────────────────────────────────────────

function FloorSlab({
  polygon, width, height,
}: { polygon?: [number, number][] | null; width: number; height: number }) {
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

  const posX = polygon ? 0 : width / 2;
  const posZ = polygon ? 0 : height / 2;

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[posX, -0.015, posZ]} receiveShadow>
      <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

// ─── Subtle room label ─────────────────────────────────────────────────────────

function RoomLabel({ cx, cz, label }: { cx: number; cz: number; label: string }) {
  return (
    <Html
      position={[cx, 0.1, cz]}
      center
      zIndexRange={[10, 20]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        fontSize: '8px',
        fontFamily: 'monospace',
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: 'rgba(148,163,184,0.65)',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        userSelect: 'none',
      }}>
        {label}
      </div>
    </Html>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function FloorPlanModel({ model, rooms = [] }: FloorPlanModelProps) {
  const cx = model.floorWidth  / 2;
  const cz = model.floorHeight / 2;
  const maxDim    = Math.max(model.floorWidth, model.floorHeight);
  const wallHeight = model.wallHeight ?? 3.0;

  const lbCount = model.walls.filter(w => w.wallType === 'load_bearing').length;
  const ptCount = model.walls.filter(w => w.wallType === 'partition').length;

  return (
    <div className="w-full h-[540px] rounded-xl overflow-hidden glass-panel border-primary/20 relative">

      {/* Status badges */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono text-primary font-medium">3D_MODEL</span>
        </div>
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground">
          <span className="text-cyan-400">■</span> {lbCount} LB&nbsp;
          <span className="text-slate-500">■</span> {ptCount} PT
        </div>
      </div>

      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{
          position: [cx, maxDim * 1.0, cz + maxDim * 0.85],
          fov: 42,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#070d1a']} />

        <ambientLight intensity={0.3} color="#8ab4d0" />
        <directionalLight
          castShadow
          position={[maxDim * 0.8, maxDim, maxDim * 0.5]}
          intensity={1.4}
          color="#e8f4ff"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={maxDim * 5}
          shadow-camera-left={-maxDim * 1.5}
          shadow-camera-right={maxDim * 1.5}
          shadow-camera-top={maxDim * 1.5}
          shadow-camera-bottom={-maxDim * 1.5}
        />
        <directionalLight
          position={[-maxDim * 0.4, maxDim * 0.4, -maxDim * 0.4]}
          intensity={0.25}
          color="#9bbfdf"
        />

        <Environment preset="city" />

        <Bounds fit clip observe margin={1.3}>
          <group position={[-cx, 0, -cz]}>

            <FloorSlab
              polygon={model.floorPolygon}
              width={model.floorWidth}
              height={model.floorHeight}
            />

            <Grid
              position={[cx, 0.001, cz]}
              args={[model.floorWidth, model.floorHeight]}
              cellSize={1}
              cellThickness={0.3}
              cellColor="#1a2d40"
              sectionSize={5}
              sectionThickness={0.7}
              sectionColor="#1e3040"
              fadeDistance={maxDim * 1.6}
            />

            {model.walls.map((wall, i) => (
              <Wall key={i} segment={wall} height={wallHeight} />
            ))}

            {rooms.map((room, i) => (
              <RoomLabel
                key={i}
                cx={room.centroidX}
                cz={room.centroidY}
                label={room.label}
              />
            ))}

          </group>
        </Bounds>

        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.03}
          enableDamping
          dampingFactor={0.06}
          minDistance={2}
          maxDistance={maxDim * 3}
        />
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
