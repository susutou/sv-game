import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, Cloud, Stars, ContactShadows } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LocationId } from '../game/types';
import { useGame } from '../game/store';
import { DEFAULT_WEATHER, fetchValleyWeather, type WeatherTheme } from './weather';

function useInteractive(id: LocationId) {
  const open = useGame((s) => s.openLocation);
  const forced = useGame((s) => s.state?.forcedHospital);
  const phase = useGame((s) => s.state?.phase);
  const locked = !!(forced && id !== 'hospital');
  const dim =
    locked ||
    phase === 'event' ||
    phase === 'gameover' ||
    phase === 'victory' ||
    phase === 'title' ||
    !phase;
  return {
    dim: !!dim && phase !== 'title' && !!phase,
    titleMode: !phase || phase === 'title',
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (phase === 'title' || !phase) return;
      if (locked || phase === 'event' || phase === 'gameover' || phase === 'victory') return;
      open(id);
    },
    onOver: (e: { stopPropagation: () => void }, group: THREE.Group | null) => {
      e.stopPropagation();
      if (phase === 'title' || !phase) return;
      document.body.style.cursor =
        locked || phase === 'event' || phase === 'gameover' || phase === 'victory'
          ? 'not-allowed'
          : 'pointer';
      if (group) group.scale.setScalar(1.06);
    },
    onOut: (group: THREE.Group | null) => {
      document.body.style.cursor = 'default';
      if (group) group.scale.setScalar(1);
    },
  };
}

function Label({ text, y }: { text: string; y: number }) {
  return (
    <Text
      position={[0, y, 0]}
      fontSize={0.38}
      color="#fffef5"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.035}
      outlineColor="#1a2040"
      fontWeight={700}
    >
      {text}
    </Text>
  );
}

/** Cartoon glass office tower with window grid + rooftop garden ball */
function OfficeBuilding({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const { dim, onClick, onOver, onOut } = useInteractive('company');
  const windows = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let y = 0.5; y < 3.4; y += 0.55) {
      for (let x = -0.7; x <= 0.7; x += 0.55) {
        pts.push([x, y, 0.92]);
        pts.push([x, y, -0.92]);
      }
    }
    return pts;
  }, []);

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow position={[0, 2, 0]}>
        <boxGeometry args={[2.2, 4, 1.7]} />
        <meshToonMaterial color={dim ? '#6a8a9a' : '#5ec8ff'} />
      </mesh>
      <mesh castShadow position={[0.9, 1.4, 0]}>
        <boxGeometry args={[0.9, 2.6, 1.4]} />
        <meshToonMaterial color={dim ? '#5a7a8a' : '#3aa0e8'} />
      </mesh>
      {/* logo orb */}
      <mesh position={[0, 4.35, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshToonMaterial color="#ff6bcb" />
      </mesh>
      <mesh position={[0, 4.7, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
        <meshToonMaterial color="#ffe566" />
      </mesh>
      {windows.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.32, 0.28, 0.06]} />
          <meshToonMaterial color={i % 3 === 0 ? '#fff7a0' : '#1a3a5a'} />
        </mesh>
      ))}
      {/* door */}
      <mesh position={[0, 0.45, 0.88]}>
        <boxGeometry args={[0.5, 0.9, 0.08]} />
        <meshToonMaterial color="#ff9f43" />
      </mesh>
      <Label text="Company" y={5.2} />
    </group>
  );
}

/** Exchange building with giant glowing ticker screen + bull-ish spike roof */
function MarketBuilding({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const screen = useRef<THREE.Mesh>(null);
  const { dim, onClick, onOver, onOut } = useInteractive('market');
  useFrame(({ clock }) => {
    if (screen.current) {
      const mat = screen.current.material as THREE.MeshToonMaterial;
      mat.color.set(clock.elapsedTime % 2 < 1 ? '#00ff9c' : '#ff4d6d');
    }
  });

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[2.6, 3, 2]} />
        <meshToonMaterial color={dim ? '#4a6a5a' : '#00c853'} />
      </mesh>
      <mesh castShadow position={[0, 3.3, 0]}>
        <coneGeometry args={[1.5, 1.1, 4]} />
        <meshToonMaterial color="#ffd54f" />
      </mesh>
      {/* ticker screen */}
      <mesh ref={screen} position={[0, 1.8, 1.05]} castShadow>
        <boxGeometry args={[2.1, 1.2, 0.12]} />
        <meshToonMaterial color="#00ff9c" />
      </mesh>
      {/* chart zig-zag as boxes */}
      {[
        [-0.7, 1.4],
        [-0.35, 1.7],
        [0, 1.55],
        [0.35, 2.0],
        [0.7, 1.85],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 1.14]}>
          <boxGeometry args={[0.22, 0.12, 0.08]} />
          <meshToonMaterial color="#0a1a12" />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 1.05]}>
        <boxGeometry args={[0.7, 0.8, 0.1]} />
        <meshToonMaterial color="#1b5e20" />
      </mesh>
      <Label text="Market" y={4.2} />
    </group>
  );
}

/** Classical cartoon bank with columns + gold dome + coin stack */
function BankBuilding({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const { dim, onClick, onOver, onOut } = useInteractive('bank');

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[2.8, 2.2, 2]} />
        <meshToonMaterial color={dim ? '#8a7a55' : '#ffd54f'} />
      </mesh>
      <mesh castShadow position={[0, 2.55, 0]}>
        <boxGeometry args={[3.1, 0.35, 2.3]} />
        <meshToonMaterial color="#fff8e1" />
      </mesh>
      <mesh castShadow position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.85, 16, 12]} />
        <meshToonMaterial color="#ffca28" />
      </mesh>
      {[-1, 0, 1].map((x) => (
        <mesh key={x} castShadow position={[x * 0.85, 1.0, 1.05]}>
          <cylinderGeometry args={[0.16, 0.16, 2, 10]} />
          <meshToonMaterial color="#fffde7" />
        </mesh>
      ))}
      {/* coin stacks */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.6, 0.2 + i * 0.18, 0.6]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.12, 16]} />
          <meshToonMaterial color="#ffeb3b" />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 1.15]}>
        <boxGeometry args={[0.7, 1.1, 0.1]} />
        <meshToonMaterial color="#6d4c41" />
      </mesh>
      <Label text="Bank" y={4.35} />
    </group>
  );
}

/** Hospital with red cross + ambulance blob */
function HospitalBuilding({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const { dim, onClick, onOver, onOut } = useInteractive('hospital');
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (pulse.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.08;
      pulse.current.scale.set(s, s, s);
    }
  });

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow position={[0, 1.6, 0]}>
        <boxGeometry args={[2.4, 3.2, 2.2]} />
        <meshToonMaterial color={dim ? '#c0c0c0' : '#ffffff'} />
      </mesh>
      <mesh castShadow position={[1.1, 1.0, 0]}>
        <boxGeometry args={[1.2, 2, 1.8]} />
        <meshToonMaterial color="#e3f2fd" />
      </mesh>
      {/* red cross */}
      <mesh ref={pulse} position={[0, 2.2, 1.15]}>
        <boxGeometry args={[0.35, 1.1, 0.12]} />
        <meshToonMaterial color="#ff1744" />
      </mesh>
      <mesh position={[0, 2.2, 1.15]}>
        <boxGeometry args={[1.1, 0.35, 0.12]} />
        <meshToonMaterial color="#ff1744" />
      </mesh>
      {/* ambulance */}
      <mesh castShadow position={[-1.8, 0.45, 1.4]}>
        <boxGeometry args={[1.3, 0.7, 0.7]} />
        <meshToonMaterial color="#ff5252" />
      </mesh>
      <mesh position={[-1.35, 0.75, 1.4]}>
        <boxGeometry args={[0.5, 0.4, 0.65]} />
        <meshToonMaterial color="#bbdefb" />
      </mesh>
      <mesh position={[-2.2, 0.18, 1.65]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshToonMaterial color="#212121" />
      </mesh>
      <mesh position={[-1.4, 0.18, 1.65]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshToonMaterial color="#212121" />
      </mesh>
      <Label text="Hospital" y={3.6} />
    </group>
  );
}

/** Cute suburban house with pitched roof */
function RealtyHouse({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const { dim, onClick, onOver, onOut } = useInteractive('realestate');

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[2.6, 2, 2.2]} />
        <meshToonMaterial color={dim ? '#a08070' : '#ff8a65'} />
      </mesh>
      <mesh castShadow position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.1, 1.5, 4]} />
        <meshToonMaterial color="#7e57c2" />
      </mesh>
      {/* chimney */}
      <mesh castShadow position={[0.8, 2.9, -0.3]}>
        <boxGeometry args={[0.35, 0.8, 0.35]} />
        <meshToonMaterial color="#8d6e63" />
      </mesh>
      {/* door + windows */}
      <mesh position={[0, 0.7, 1.15]}>
        <boxGeometry args={[0.55, 1.0, 0.08]} />
        <meshToonMaterial color="#5d4037" />
      </mesh>
      <mesh position={[-0.8, 1.2, 1.15]}>
        <boxGeometry args={[0.5, 0.5, 0.08]} />
        <meshToonMaterial color="#81d4fa" />
      </mesh>
      <mesh position={[0.8, 1.2, 1.15]}>
        <boxGeometry args={[0.5, 0.5, 0.08]} />
        <meshToonMaterial color="#81d4fa" />
      </mesh>
      {/* lawn flowers */}
      {[
        [-1.3, 0.8],
        [1.2, 1.0],
        [-0.9, 1.4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.15, z]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshToonMaterial color={['#ff4081', '#ffeb3b', '#ea80fc'][i]} />
        </mesh>
      ))}
      <mesh position={[1.5, 0.7, 0.8]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
        <meshToonMaterial color="#6d4c41" />
      </mesh>
      <mesh position={[1.5, 1.5, 0.8]} castShadow>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshToonMaterial color="#66bb6a" />
      </mesh>
      <Label text="Realty" y={3.6} />
    </group>
  );
}

function CartoonAvatar() {
  const week = useGame((s) => s.state?.week ?? 1);
  const ref = useRef<THREE.Group>(null);
  const targets = useMemo(
    () => [
      [-3.2, 0, 2.2],
      [2.8, 0, 3.2],
      [0.2, 0, -1.2],
      [-4.5, 0, -0.3],
      [4.2, 0, 0.5],
    ],
    [],
  );
  useFrame((state) => {
    if (!ref.current) return;
    const t = targets[week % targets.length];
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, t[0], 0.05);
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, t[2], 0.05);
    ref.current.position.y = 0.55 + Math.sin(state.clock.elapsedTime * 4) * 0.06;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
  });
  return (
    <group ref={ref} position={[0, 0.55, 2.5]}>
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.22, 0.4, 4, 8]} />
        <meshToonMaterial color="#7c4dff" />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshToonMaterial color="#ffcc80" />
      </mesh>
      <mesh position={[0.1, 0.6, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshToonMaterial color="#212121" />
      </mesh>
      <mesh position={[-0.1, 0.6, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshToonMaterial color="#212121" />
      </mesh>
      {/* hoodie hood */}
      <mesh position={[0, 0.72, -0.05]}>
        <sphereGeometry args={[0.22, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color="#651fff" />
      </mesh>
      {/* laptop */}
      <mesh position={[0.35, 0.25, 0.25]} rotation={[0.4, -0.3, 0]}>
        <boxGeometry args={[0.35, 0.02, 0.25]} />
        <meshToonMaterial color="#90caf9" />
      </mesh>
    </group>
  );
}

function Rain({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = Math.random() * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (!active || !ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 8;
      if (y < 0) y = 12;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });
  if (!active) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a0d8ff" size={0.08} transparent opacity={0.7} />
    </points>
  );
}

function NatureDecor({ theme }: { theme: WeatherTheme }) {
  return (
    <>
      {/* colorful hills */}
      <Float speed={0.35} floatIntensity={0.2}>
        <mesh position={[-10, 1.2, -7]} castShadow>
          <sphereGeometry args={[3.2, 16, 12]} />
          <meshToonMaterial color="#43a047" />
        </mesh>
      </Float>
      <mesh position={[11, 1.6, -6]} castShadow>
        <sphereGeometry args={[3.8, 16, 12]} />
        <meshToonMaterial color="#66bb6a" />
      </mesh>
      <mesh position={[-6, 0.8, -9]} castShadow>
        <sphereGeometry args={[2.2, 14, 10]} />
        <meshToonMaterial color="#81c784" />
      </mesh>
      {/* palm-ish trees */}
      {[
        [-7, 3],
        [6.5, 4],
        [-2, 5.5],
        [8, -2],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 2.2, 8]} />
            <meshToonMaterial color="#8d6e63" />
          </mesh>
          <mesh castShadow position={[0, 2.3, 0]}>
            <sphereGeometry args={[0.85, 12, 12]} />
            <meshToonMaterial color={['#26a69a', '#42a5f5', '#ab47bc', '#ff7043'][i]} />
          </mesh>
        </group>
      ))}
      {/* flowers field */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh
          key={i}
          position={[(i % 6) * 1.2 - 3.5, 0.12, 4.5 + Math.floor(i / 6) * 0.7]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshToonMaterial
            color={['#ff4081', '#ffeb3b', '#40c4ff', '#ea80fc', '#69f0ae'][i % 5]}
          />
        </mesh>
      ))}
      {/* cartoon sun / moon */}
      <mesh position={[7, 9, -8]}>
        <sphereGeometry args={[1.2, 20, 20]} />
        <meshBasicMaterial color={theme.sunColor} />
      </mesh>
      {theme.cloudOpacity > 0.2 && (
        <>
          <Cloud position={[-4, 7, -3]} opacity={theme.cloudOpacity} speed={0.2} scale={1.4} />
          <Cloud position={[5, 8, -5]} opacity={theme.cloudOpacity * 0.9} speed={0.15} scale={1.8} />
          <Cloud position={[0, 9, -8]} opacity={theme.cloudOpacity * 0.7} speed={0.1} scale={2.2} />
        </>
      )}
      {theme.showStars && <Stars radius={40} depth={30} count={800} factor={3} fade speed={0.6} />}
      <Rain active={theme.showRain} />
    </>
  );
}

function Campus({ theme }: { theme: WeatherTheme }) {
  const showTitle = useGame((s) => !s.state || s.state.phase === 'title');

  return (
    <>
      <color attach="background" args={[theme.skyTop]} />
      <fog attach="fog" args={[theme.fog, 14, 42]} />
      <ambientLight intensity={0.7} color={theme.ambient} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, 0.85]} />
      <directionalLight
        castShadow
        intensity={theme.sunIntensity}
        position={[8, 12, 5]}
        color={theme.sunColor}
        shadow-mapSize={[1024, 1024]}
      />

      {/* sky gradient ground plane + bay water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[20, 64]} />
        <meshToonMaterial color={theme.ground} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[11, -0.03, 7]} receiveShadow>
        <circleGeometry args={[11, 48]} />
        <meshToonMaterial color={theme.water} />
      </mesh>
      {/* rainbow path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.5]} receiveShadow>
        <planeGeometry args={[2.4, 13]} />
        <meshToonMaterial color="#ffe082" />
      </mesh>

      <OfficeBuilding position={[-3.4, 0, 1.0]} />
      <MarketBuilding position={[3.0, 0, 2.0]} />
      <BankBuilding position={[0.1, 0, -2.6]} />
      <HospitalBuilding position={[-4.8, 0, -1.8]} />
      <RealtyHouse position={[4.6, 0, -1.0]} />

      {!showTitle && <CartoonAvatar />}
      <NatureDecor theme={theme} />
      <ContactShadows opacity={0.4} scale={30} blur={2.2} far={10} color="#1a3040" />
      <PerspectiveCam />
    </>
  );
}

function PerspectiveCam() {
  const phase = useGame((s) => s.state?.phase);
  useFrame(({ camera, clock }) => {
    const title = !phase || phase === 'title';
    const targetY = title ? 6.2 : 8.0;
    const targetZ = title ? 12 : 14.5;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.03);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.03);
    camera.position.x = Math.sin(clock.elapsedTime * 0.15) * (title ? 0.5 : 1.0);
    camera.lookAt(0, 1.2, 0);
  });
  return null;
}

export function Scene() {
  const [theme, setTheme] = useState<WeatherTheme>(DEFAULT_WEATHER);

  useEffect(() => {
    let alive = true;
    fetchValleyWeather().then((t) => {
      if (alive) setTheme(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="scene-layer">
      <div className="weather-badge" aria-live="polite">
        <span className="weather-dot" />
        {theme.label}
      </div>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 6.2, 12], fov: 42, near: 0.1, far: 90 }}
        gl={{ antialias: true }}
      >
        <Campus theme={theme} />
      </Canvas>
    </div>
  );
}
