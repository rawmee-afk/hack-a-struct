import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Bounds } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeDModel, WallSegment, WindowOpening } from '@workspace/api-client-react';

interface FloorPlanModelProps {
  model: ThreeDModel;
}

/** Single extruded wall — coloured by structural type */
function Wall({ segment, height }: { segment: WallSegment; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { length, thickness, centerX, centerZ, rotationY, isLoadBearing } = useMemo(() => {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const calcLength  = segment.length || Math.hypot(dx, dy);
    const centerX     = (segment.x1 + segment.x2) / 2;
    const centerZ     = (segment.y1 + segment.y2) / 2;
    const rotationY   = -Math.atan2(dy, dx);
    const isLoadBearing = segment.wallType === 'load_bearing';
    return { length: calcLength, thickness: segment.thickness, centerX, centerZ, rotationY, isLoadBearing };
  }, [segment]);

  // Load-bearing → bright cyan-white; partition → steel blue
  const color    = isLoadBearing ? '#22d3ee' : '#64748b';
  const emissive = isLoadBearing ? '#0e7490' : '#1e293b';
  const opacity  = isLoadBearing ? 0.92 : 0.78;

  return (
    <mesh
      ref={meshRef}
      position={[centerX, height / 2, centerZ]}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.25}
        roughness={0.2}
        metalness={0.7}
        transparent
        opacity={opacity}
        envMapIntensity={1.5}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, height, thickness)]} />
        <lineBasicMaterial color="#ffffff" opacity={0.2} transparent />
      </lineSegments>
    </mesh>
  );
}

/** Window opening — glass pane with white aluminium frame */
function Window({ win, wallHeight }: { win: WindowOpening; wallHeight: number }) {
  const { cx, cz, width, rotationY, sillHeight, openingHeight } = win;

  // Clamp window geometry so it fits within wall height
  const sill   = Math.min(sillHeight,   wallHeight * 0.30);
  const wh     = Math.min(openingHeight, wallHeight - sill - 0.1);
  const centerY = sill + wh / 2;
  const fw = 0.06;   // frame width
  const fd = 0.14;   // frame depth (protrudes from wall face)
  const gd = 0.03;   // glass depth

  return (
    <group position={[cx, centerY, cz]} rotation={[0, rotationY, 0]}>
      {/* ── Glass pane ── */}
      <mesh castShadow>
        <boxGeometry args={[width - fw * 2, wh - fw * 2, gd]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.35} roughness={0.05} metalness={0.1} envMapIntensity={2} />
      </mesh>

      {/* ── Frame: top rail ── */}
      <mesh position={[0, wh / 2 - fw / 2, 0]} castShadow>
        <boxGeometry args={[width, fw, fd]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.6} />
      </mesh>

      {/* ── Frame: bottom sill ── */}
      <mesh position={[0, -(wh / 2 - fw / 2), 0]} castShadow>
        <boxGeometry args={[width, fw, fd]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.6} />
      </mesh>

      {/* ── Frame: left jamb ── */}
      <mesh position={[-(width / 2 - fw / 2), 0, 0]} castShadow>
        <boxGeometry args={[fw, wh, fd]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.6} />
      </mesh>

      {/* ── Frame: right jamb ── */}
      <mesh position={[width / 2 - fw / 2, 0, 0]} castShadow>
        <boxGeometry args={[fw, wh, fd]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.6} />
      </mesh>

      {/* ── Centre mullion ── */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[fw * 0.7, wh - fw * 2, fd]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Floor slab — uses exact polygon footprint when available, falls back to rectangle */
function FloorSlab({
  polygon,
  width,
  height,
}: {
  polygon?: [number, number][] | null;
  width: number;
  height: number;
}) {
  const geometry = useMemo(() => {
    if (polygon && polygon.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(polygon[0][0], polygon[0][1]);
      for (let i = 1; i < polygon.length; i++) {
        shape.lineTo(polygon[i][0], polygon[i][1]);
      }
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    }
    return new THREE.PlaneGeometry(width, height);
  }, [polygon, width, height]);

  const posX = polygon ? 0 : width / 2;
  const posZ = polygon ? 0 : height / 2;

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[posX, -0.01, posZ]}
      receiveShadow
    >
      <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.15} />
    </mesh>
  );
}

export function FloorPlanModel({ model }: FloorPlanModelProps) {
  const floorCenterX = model.floorWidth  / 2;
  const floorCenterZ = model.floorHeight / 2;
  const maxDim       = Math.max(model.floorWidth, model.floorHeight);

  const wallHeight = model.wallHeight ?? 3.0;

  const loadBearingCount = model.walls.filter(w => w.wallType === 'load_bearing').length;
  const partitionCount   = model.walls.filter(w => w.wallType === 'partition').length;
  const windowCount      = model.windows?.length ?? 0;

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden glass-panel border-primary/20 relative">
      {/* Status bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono text-primary font-medium">3D_RENDER_ACTIVE</span>
        </div>
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground">
          <span className="text-cyan-400">■</span> LB: {loadBearingCount}
          &nbsp;&nbsp;
          <span className="text-slate-400">■</span> Part: {partitionCount}
          {windowCount > 0 && (
            <>&nbsp;&nbsp;<span className="text-sky-300">⬜</span> Win: {windowCount}</>
          )}
        </div>
      </div>

      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{
          position: [floorCenterX, maxDim * 1.2, floorCenterZ + maxDim * 0.8],
          fov: 45,
        }}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', maxDim, maxDim * 3]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          position={[maxDim, maxDim, maxDim]}
          intensity={1.5}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={maxDim * 4}
          shadow-camera-left={-maxDim}
          shadow-camera-right={maxDim}
          shadow-camera-top={maxDim}
          shadow-camera-bottom={-maxDim}
        />

        <Environment preset="city" />

        <Bounds fit clip observe margin={1.2}>
          <group position={[-floorCenterX, 0, -floorCenterZ]}>
            {/* Precise floor slab */}
            <FloorSlab
              polygon={model.floorPolygon}
              width={model.floorWidth}
              height={model.floorHeight}
            />

            {/* Grid overlay */}
            <Grid
              position={[floorCenterX, 0.01, floorCenterZ]}
              args={[model.floorWidth, model.floorHeight]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#334155"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#475569"
              fadeDistance={maxDim}
            />

            {/* Walls */}
            {model.walls.map((wall, idx) => (
              <Wall key={idx} segment={wall} height={wallHeight} />
            ))}

            {/* Windows — glass panes with aluminium frames */}
            {model.windows?.map((win, idx) => (
              <Window key={`win-${idx}`} win={win} wallHeight={wallHeight} />
            ))}
          </group>
        </Bounds>

        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.05}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur px-3 py-2 rounded-md border border-border text-xs font-mono text-muted-foreground flex flex-col gap-1">
        <p>WALL_HEIGHT: <span className="text-white">{wallHeight.toFixed(1)} m</span></p>
        <p>FLOOR: <span className="text-white">{model.floorWidth.toFixed(1)} × {model.floorHeight.toFixed(1)} m</span></p>
        <p>CTRL: Orbit · SHIFT+DRAG: Pan</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur px-3 py-2 rounded-md border border-border text-xs font-mono flex flex-col gap-1">
        <p><span className="text-cyan-400 font-bold">■</span> Load-bearing (SF=1.5, 230mm)</p>
        <p><span className="text-slate-400 font-bold">■</span> Partition (SF=1.23, 115mm)</p>
        {windowCount > 0 && (
          <p><span className="text-sky-300 font-bold">⬜</span> Windows ({windowCount} detected)</p>
        )}
      </div>
    </div>
  );
}
