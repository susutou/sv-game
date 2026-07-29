import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, ContactShadows } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { LocationId } from '../game/types';
import { useGame } from '../game/store';

type BuildingProps = {
  id: LocationId;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  accent?: string;
  label: string;
};

function Building({ id, position, size, color, accent = '#e8b86d', label }: BuildingProps) {
  const open = useGame((s) => s.openLocation);
  const forced = useGame((s) => s.state?.forcedHospital);
  const phase = useGame((s) => s.state?.phase);
  const mesh = useRef<THREE.Mesh>(null);
  const locked = forced && id !== 'hospital';
  const dim = locked || phase === 'event' || phase === 'gameover' || phase === 'victory';

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        castShadow
        receiveShadow
        position={[0, size[1] / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!dim) open(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = dim ? 'not-allowed' : 'pointer';
          if (mesh.current) mesh.current.scale.setScalar(1.04);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          if (mesh.current) mesh.current.scale.setScalar(1);
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.15}
          transparent={dim}
          opacity={dim ? 0.45 : 1}
        />
      </mesh>
      {/* roof cap */}
      <mesh position={[0, size[1] + 0.08, 0]} castShadow>
        <boxGeometry args={[size[0] * 1.05, 0.12, size[2] * 1.05]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.3} />
      </mesh>
      <Text
        position={[0, size[1] + 0.55, 0]}
        fontSize={0.35}
        color="#f2ebe0"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#0f1a14"
      >
        {label}
      </Text>
    </group>
  );
}

function Avatar() {
  const week = useGame((s) => s.state?.week ?? 1);
  const ref = useRef<THREE.Group>(null);
  const targets = useMemo(
    () => [
      [-3.2, 0, 1.2],
      [2.8, 0, 2.2],
      [0.2, 0, -2.4],
      [-4.5, 0, -1.5],
      [4.2, 0, -0.8],
    ],
    [],
  );
  useFrame((state) => {
    if (!ref.current) return;
    const t = targets[week % targets.length];
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, t[0], 0.04);
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, t[2], 0.04);
    ref.current.position.y = 0.35 + Math.sin(state.clock.elapsedTime * 3) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 0.35, 2]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.18, 0.35, 4, 8]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#f0d5b8" />
      </mesh>
    </group>
  );
}

function SunDrift() {
  const ref = useRef<THREE.DirectionalLight>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.08;
    ref.current.position.x = Math.cos(t) * 8;
    ref.current.position.z = Math.sin(t) * 6;
  });
  return (
    <directionalLight
      ref={ref}
      castShadow
      intensity={1.35}
      position={[6, 10, 4]}
      color="#ffd6a0"
      shadow-mapSize={[1024, 1024]}
    />
  );
}

function Campus() {
  const showTitle = useGame((s) => !s.state || s.state.phase === 'title');

  return (
    <>
      <color attach="background" args={['#1c3340']} />
      <fog attach="fog" args={['#6a8a9a', 12, 38]} />
      <ambientLight intensity={0.45} color="#b8d4c8" />
      <SunDrift />
      <hemisphereLight args={['#f0e2c8', '#2a4038', 0.55]} />

      {/* ground plane — bay peninsula vibe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color="#3d5c4a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, -0.02, 6]} receiveShadow>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial color="#3a6b7a" roughness={1} metalness={0.05} />
      </mesh>

      {/* path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[2.2, 14]} />
        <meshStandardMaterial color="#6b5b4a" roughness={1} />
      </mesh>

      <Building
        id="company"
        position={[-3.2, 0, 1.2]}
        size={[2.4, 2.8, 2]}
        color="#4a6b5c"
        accent="#e8b86d"
        label="Company"
      />
      <Building
        id="market"
        position={[2.8, 0, 2.2]}
        size={[2.2, 2.2, 2.2]}
        color="#3d5a80"
        accent="#7eb8a2"
        label="Market"
      />
      <Building
        id="bank"
        position={[0.2, 0, -2.4]}
        size={[2.6, 1.8, 2]}
        color="#5c4a3a"
        accent="#e8dcc8"
        label="Bank"
      />
      <Building
        id="hospital"
        position={[-4.5, 0, -1.5]}
        size={[2, 2.4, 2.4]}
        color="#8b5a5a"
        accent="#f2ebe0"
        label="Hospital"
      />
      <Building
        id="realestate"
        position={[4.2, 0, -0.8]}
        size={[2.4, 1.6, 2.6]}
        color="#6b7a4a"
        accent="#e8b86d"
        label="Realty"
      />

      {!showTitle && <Avatar />}

      {/* decorative hills */}
      <Float speed={0.4} rotationIntensity={0} floatIntensity={0.15}>
        <mesh position={[-9, 0.6, -6]} castShadow>
          <sphereGeometry args={[2.2, 24, 16]} />
          <meshStandardMaterial color="#2f4a3c" flatShading />
        </mesh>
      </Float>
      <mesh position={[9, 0.9, -5]} castShadow>
        <sphereGeometry args={[2.8, 24, 16]} />
        <meshStandardMaterial color="#355245" flatShading />
      </mesh>

      <ContactShadows opacity={0.35} scale={28} blur={2.5} far={8} />

      {/* camera feels like golden hour overlook */}
      <PerspectiveCam />
    </>
  );
}

function PerspectiveCam() {
  const phase = useGame((s) => s.state?.phase);
  useFrame(({ camera, clock }) => {
    const title = !phase || phase === 'title';
    const targetY = title ? 5.5 : 7.2;
    const targetZ = title ? 11 : 13;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.03);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.03);
    camera.position.x = Math.sin(clock.elapsedTime * 0.12) * (title ? 0.4 : 0.8);
    camera.lookAt(0, 0.8, 0);
  });
  return null;
}

export function Scene() {
  return (
    <div className="scene-layer">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 5.5, 11], fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: true }}
      >
        <Campus />
      </Canvas>
    </div>
  );
}
