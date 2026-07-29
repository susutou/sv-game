import { Canvas, useFrame } from '@react-three/fiber';
import {
  Text,
  Cloud,
  Stars,
  ContactShadows,
  Environment,
  Sky,
} from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LocationId } from '../game/types';
import { useGame } from '../game/store';
import { DEFAULT_WEATHER, fetchValleyWeather, type WeatherTheme } from './weather';
import { CharacterNpcs } from './Characters';

const BUILDING_SCALE = 0.58;

function useInteractive(id: LocationId) {
  const open = useGame((s) => s.openLocation);
  const forced = useGame((s) => s.state?.forcedHospital);
  const phase = useGame((s) => s.state?.phase);
  const locked = !!(forced && id !== 'hospital');
  const blocked =
    locked ||
    phase === 'event' ||
    phase === 'gameover' ||
    phase === 'victory' ||
    phase === 'title' ||
    !phase;
  return {
    dim:
      !!(
        locked ||
        phase === 'event' ||
        phase === 'gameover' ||
        phase === 'victory' ||
        phase === 'character'
      ) &&
      !!phase &&
      phase !== 'title',
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (blocked) return;
      open(id);
    },
    onOver: (e: { stopPropagation: () => void }, group: THREE.Group | null) => {
      e.stopPropagation();
      if (phase === 'title' || !phase) return;
      document.body.style.cursor = blocked ? 'not-allowed' : 'pointer';
      if (group && !blocked) group.scale.setScalar(1.025);
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
      fontSize={0.32}
      color="#f4f1ea"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#1a1f18"
      fillOpacity={0.92}
    >
      {text}
    </Text>
  );
}

function GlassPanel({
  args,
  position,
  rotation,
  color = '#8ec8e8',
  opacity = 0.45,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.15}
        roughness={0.08}
        transmission={0.55}
        thickness={0.4}
        transparent
        opacity={opacity}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

/** Modern Silicon Valley glass office campus building */
function OfficeBuilding({
  position,
  dim,
}: {
  position: [number, number, number];
  dim: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const { onClick, onOver, onOut } = useInteractive('company');
  const opacity = dim ? 0.45 : 1;

  const windows = useMemo(() => {
    const pts: { pos: [number, number, number]; w: number; h: number }[] = [];
    for (let floor = 0; floor < 6; floor++) {
      const y = 0.55 + floor * 0.58;
      for (let col = -2; col <= 2; col++) {
        pts.push({ pos: [col * 0.42, y, 1.02], w: 0.32, h: 0.42 });
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
      {/* concrete podium */}
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[2.8, 0.36, 2.2]} />
        <meshStandardMaterial color="#9a9a92" roughness={0.85} metalness={0.05} transparent opacity={opacity} />
      </mesh>
      {/* main tower */}
      <mesh castShadow receiveShadow position={[0, 2.15, 0]}>
        <boxGeometry args={[2.3, 3.6, 1.85]} />
        <meshStandardMaterial color="#c8d0d6" roughness={0.35} metalness={0.45} transparent opacity={opacity} />
      </mesh>
      {/* side wing */}
      <mesh castShadow receiveShadow position={[1.15, 1.4, 0.1]}>
        <boxGeometry args={[0.95, 2.1, 1.5]} />
        <meshStandardMaterial color="#aeb6bc" roughness={0.4} metalness={0.35} transparent opacity={opacity} />
      </mesh>
      {/* curtain wall glass face */}
      <GlassPanel args={[2.15, 3.4, 0.08]} position={[0, 2.15, 0.95]} opacity={dim ? 0.25 : 0.55} />
      {windows.map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={[w.w, w.h, 0.04]} />
          <meshStandardMaterial
            color={i % 5 === 0 ? '#ffe9c2' : '#1c3344'}
            emissive={i % 5 === 0 ? '#ffd59a' : '#000000'}
            emissiveIntensity={i % 5 === 0 ? 0.35 : 0}
            roughness={0.2}
            metalness={0.6}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
      {/* entrance canopy */}
      <mesh castShadow position={[0, 0.95, 1.15]}>
        <boxGeometry args={[1.2, 0.08, 0.55]} />
        <meshStandardMaterial color="#5a6066" metalness={0.7} roughness={0.3} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.5, 1.0]}>
        <boxGeometry args={[0.7, 0.9, 0.06]} />
        <meshPhysicalMaterial color="#89b8d4" metalness={0.2} roughness={0.1} transparent opacity={0.65} />
      </mesh>
      {/* rooftop HVAC */}
      <mesh castShadow position={[-0.5, 4.1, 0]}>
        <boxGeometry args={[0.7, 0.35, 0.55]} />
        <meshStandardMaterial color="#7a8086" metalness={0.55} roughness={0.4} transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0.55, 4.05, 0.2]}>
        <boxGeometry args={[0.5, 0.25, 0.45]} />
        <meshStandardMaterial color="#6e747a" metalness={0.5} roughness={0.45} transparent opacity={opacity} />
      </mesh>
      <Label text="Company" y={4.55} />
    </group>
  );
}

/** Financial / trading hall with glass atrium */
function MarketBuilding({
  position,
  dim,
}: {
  position: [number, number, number];
  dim: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const screen = useRef<THREE.Mesh>(null);
  const { onClick, onOver, onOut } = useInteractive('market');
  const opacity = dim ? 0.45 : 1;

  useFrame(({ clock }) => {
    if (!screen.current) return;
    const mat = screen.current.material as THREE.MeshStandardMaterial;
    const t = (Math.sin(clock.elapsedTime * 1.4) + 1) / 2;
    mat.emissive.setRGB(0.02, 0.25 + t * 0.2, 0.08);
  });

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow receiveShadow position={[0, 1.55, 0]}>
        <boxGeometry args={[2.7, 3.1, 2.1]} />
        <meshStandardMaterial color="#2f3d36" roughness={0.55} metalness={0.25} transparent opacity={opacity} />
      </mesh>
      {/* stone base */}
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[2.95, 0.4, 2.3]} />
        <meshStandardMaterial color="#8b8f86" roughness={0.9} transparent opacity={opacity} />
      </mesh>
      {/* glass atrium */}
      <GlassPanel args={[2.4, 2.2, 0.1]} position={[0, 1.8, 1.08]} color="#9fd4b5" opacity={dim ? 0.25 : 0.5} />
      {/* LED ticker board */}
      <mesh ref={screen} position={[0, 2.35, 1.16]} castShadow>
        <boxGeometry args={[2.0, 0.85, 0.06]} />
        <meshStandardMaterial
          color="#0a1f14"
          emissive="#0d3d22"
          emissiveIntensity={0.9}
          roughness={0.35}
          metalness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* chart bars on ticker */}
      {[0.35, 0.55, 0.42, 0.7, 0.5, 0.62].map((h, i) => (
        <mesh key={i} position={[-0.75 + i * 0.3, 2.05 + h / 2, 1.2]}>
          <boxGeometry args={[0.14, h, 0.04]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#3dd68c' : '#e85d4c'}
            emissive={i % 2 === 0 ? '#1a8a50' : '#8a2a20'}
            emissiveIntensity={0.5}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 1.1]}>
        <boxGeometry args={[0.75, 0.95, 0.08]} />
        <meshPhysicalMaterial color="#6a9080" metalness={0.3} roughness={0.15} transparent opacity={0.7} />
      </mesh>
      {/* copper roof trim */}
      <mesh castShadow position={[0, 3.2, 0]}>
        <boxGeometry args={[2.85, 0.18, 2.25]} />
        <meshStandardMaterial color="#8a6a4a" metalness={0.55} roughness={0.35} transparent opacity={opacity} />
      </mesh>
      <Label text="Market" y={3.65} />
    </group>
  );
}

/** Classical bank with stone columns and copper dome */
function BankBuilding({
  position,
  dim,
}: {
  position: [number, number, number];
  dim: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const { onClick, onOver, onOut } = useInteractive('bank');
  const opacity = dim ? 0.45 : 1;

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[2.9, 2.3, 2.1]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.75} metalness={0.08} transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0, 2.45, 0]}>
        <boxGeometry args={[3.15, 0.28, 2.3]} />
        <meshStandardMaterial color="#efeae0" roughness={0.65} transparent opacity={opacity} />
      </mesh>
      {/* dome */}
      <mesh castShadow position={[0, 3.15, 0]}>
        <sphereGeometry args={[0.78, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b08d57" metalness={0.65} roughness={0.28} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 3.55, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.35, 12]} />
        <meshStandardMaterial color="#9a7a45" metalness={0.7} roughness={0.3} transparent opacity={opacity} />
      </mesh>
      {[-1.05, 0, 1.05].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, 1.05, 1.12]}>
            <cylinderGeometry args={[0.14, 0.16, 1.9, 16]} />
            <meshStandardMaterial color="#f0ebe3" roughness={0.55} transparent opacity={opacity} />
          </mesh>
          <mesh position={[x, 2.05, 1.12]}>
            <boxGeometry args={[0.38, 0.12, 0.38]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.6} transparent opacity={opacity} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.55, 1.2]}>
        <boxGeometry args={[0.65, 1.0, 0.08]} />
        <meshStandardMaterial color="#3d3228" roughness={0.55} metalness={0.15} transparent opacity={opacity} />
      </mesh>
      {/* steps */}
      <mesh receiveShadow position={[0, 0.12, 1.35]}>
        <boxGeometry args={[2.2, 0.12, 0.55]} />
        <meshStandardMaterial color="#c4beb2" roughness={0.85} transparent opacity={opacity} />
      </mesh>
      <Label text="Bank" y={4.0} />
    </group>
  );
}

/** Medical clinic — clean white facade, red cross, ambulance */
function HospitalBuilding({
  position,
  dim,
}: {
  position: [number, number, number];
  dim: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const { onClick, onOver, onOut } = useInteractive('hospital');
  const opacity = dim ? 0.45 : 1;

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow receiveShadow position={[0, 1.65, 0]}>
        <boxGeometry args={[2.5, 3.3, 2.25]} />
        <meshStandardMaterial color="#f2f4f6" roughness={0.55} metalness={0.05} transparent opacity={opacity} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.2, 1.05, 0]}>
        <boxGeometry args={[1.15, 2.1, 1.85]} />
        <meshStandardMaterial color="#e4eaf0" roughness={0.5} transparent opacity={opacity} />
      </mesh>
      {/* window bands */}
      {[0.9, 1.6, 2.3].map((y) => (
        <mesh key={y} position={[-0.15, y, 1.15]}>
          <boxGeometry args={[1.9, 0.4, 0.05]} />
          <meshPhysicalMaterial color="#7eb6d4" metalness={0.2} roughness={0.12} transparent opacity={0.7} />
        </mesh>
      ))}
      {/* red cross sign */}
      <mesh position={[0, 2.55, 1.18]}>
        <boxGeometry args={[0.28, 0.95, 0.08]} />
        <meshStandardMaterial color="#c62828" roughness={0.4} emissive="#5a1010" emissiveIntensity={0.2} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 2.55, 1.18]}>
        <boxGeometry args={[0.95, 0.28, 0.08]} />
        <meshStandardMaterial color="#c62828" roughness={0.4} emissive="#5a1010" emissiveIntensity={0.2} transparent opacity={opacity} />
      </mesh>
      {/* ambulance */}
      <group position={[-1.95, 0, 1.55]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[1.35, 0.65, 0.72]} />
          <meshStandardMaterial color="#eceff1" roughness={0.35} metalness={0.25} transparent opacity={opacity} />
        </mesh>
        <mesh position={[0.35, 0.75, 0]}>
          <boxGeometry args={[0.55, 0.35, 0.68]} />
          <meshPhysicalMaterial color="#90caf9" metalness={0.2} roughness={0.1} transparent opacity={0.75} />
        </mesh>
        <mesh position={[-0.15, 0.55, 0.38]}>
          <boxGeometry args={[0.45, 0.2, 0.04]} />
          <meshStandardMaterial color="#c62828" transparent opacity={opacity} />
        </mesh>
        <mesh castShadow position={[-0.4, 0.18, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
          <meshStandardMaterial color="#212121" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0.4, 0.18, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
          <meshStandardMaterial color="#212121" roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[0, 0.55, 1.16]}>
        <boxGeometry args={[0.7, 1.0, 0.06]} />
        <meshPhysicalMaterial color="#90a4ae" metalness={0.25} roughness={0.15} transparent opacity={0.7} />
      </mesh>
      <Label text="Hospital" y={3.55} />
    </group>
  );
}

/** Peninsula craftsman / modern house for realty */
function RealtyHouse({
  position,
  dim,
}: {
  position: [number, number, number];
  dim: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const { onClick, onOver, onOut } = useInteractive('realestate');
  const opacity = dim ? 0.45 : 1;

  return (
    <group
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => onOver(e, ref.current)}
      onPointerOut={() => onOut(ref.current)}
    >
      <mesh castShadow receiveShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[2.7, 2.1, 2.3]} />
        <meshStandardMaterial color="#c4a484" roughness={0.8} metalness={0.05} transparent opacity={opacity} />
      </mesh>
      {/* pitched roof */}
      <mesh castShadow position={[0, 2.45, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.05, 1.35, 4]} />
        <meshStandardMaterial color="#5c4a3e" roughness={0.7} metalness={0.1} transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0.85, 2.85, -0.25]}>
        <boxGeometry args={[0.32, 0.7, 0.32]} />
        <meshStandardMaterial color="#6d5a4c" roughness={0.75} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.7, 1.18]}>
        <boxGeometry args={[0.55, 1.05, 0.06]} />
        <meshStandardMaterial color="#3e342c" roughness={0.6} transparent opacity={opacity} />
      </mesh>
      <mesh position={[-0.85, 1.25, 1.18]}>
        <boxGeometry args={[0.55, 0.55, 0.05]} />
        <meshPhysicalMaterial color="#a8d0e8" metalness={0.15} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.85, 1.25, 1.18]}>
        <boxGeometry args={[0.55, 0.55, 0.05]} />
        <meshPhysicalMaterial color="#a8d0e8" metalness={0.15} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* porch */}
      <mesh castShadow position={[0, 0.95, 1.35]}>
        <boxGeometry args={[1.4, 0.06, 0.55]} />
        <meshStandardMaterial color="#8a7a68" roughness={0.7} transparent opacity={opacity} />
      </mesh>
      {/* oak tree */}
      <group position={[1.7, 0, 1.0]}>
        <mesh castShadow position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 1.5, 10]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} transparent opacity={opacity} />
        </mesh>
        <mesh castShadow position={[0, 1.85, 0]}>
          <sphereGeometry args={[0.7, 20, 16]} />
          <meshStandardMaterial color="#3d6b45" roughness={0.85} transparent opacity={opacity} />
        </mesh>
        <mesh castShadow position={[0.35, 1.65, 0.2]}>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshStandardMaterial color="#4a7a52" roughness={0.85} transparent opacity={opacity} />
        </mesh>
      </group>
      {/* lawn hedge */}
      <mesh receiveShadow position={[0, 0.18, 1.7]}>
        <boxGeometry args={[2.4, 0.25, 0.35]} />
        <meshStandardMaterial color="#4f7a4a" roughness={0.9} transparent opacity={opacity} />
      </mesh>
      <Label text="Realty" y={3.45} />
    </group>
  );
}

function EngineerAvatar() {
  const week = useGame((s) => s.state?.week ?? 1);
  const ref = useRef<THREE.Group>(null);
  const targets = useMemo(
    () => [
      [-5.5, 0, 3.5],
      [5.0, 0, 4.5],
      [0.4, 0, -4.0],
      [-7.5, 0, -1.5],
      [7.2, 0, -0.5],
      [2.2, 0, 5.5],
    ],
    [],
  );
  useFrame((state) => {
    if (!ref.current) return;
    const t = targets[week % targets.length];
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, t[0], 0.04);
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, t[2], 0.04);
    ref.current.position.y = 0.52 + Math.sin(state.clock.elapsedTime * 2.2) * 0.03;
  });

  return (
    <group ref={ref} position={[0, 0.52, 2.6]}>
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.42, 6, 12]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.65} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#d2a679" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.62, -0.02]}>
        <sphereGeometry args={[0.23, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0.32, 0.2, 0.22]} rotation={[0.5, -0.4, 0.1]}>
        <boxGeometry args={[0.32, 0.02, 0.22]} />
        <meshStandardMaterial color="#37474f" metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Rain({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = Math.random() * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (!active || !ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 9;
      if (y < 0) y = 14;
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
      <pointsMaterial color="#b7c9d6" size={0.05} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

function Nature({ theme }: { theme: WeatherTheme }) {
  return (
    <>
      {/* distant hills — bigger peninsula */}
      <mesh position={[-18, 1.4, -14]} castShadow>
        <sphereGeometry args={[5.5, 32, 20]} />
        <meshStandardMaterial color="#4a6b52" roughness={0.95} />
      </mesh>
      <mesh position={[19, 1.8, -12]} castShadow>
        <sphereGeometry args={[6.2, 32, 20]} />
        <meshStandardMaterial color="#557a5c" roughness={0.95} />
      </mesh>
      <mesh position={[-8, 0.9, -16]} castShadow>
        <sphereGeometry args={[3.6, 28, 16]} />
        <meshStandardMaterial color="#5d8260" roughness={0.95} />
      </mesh>
      <mesh position={[10, 1.0, -15]} castShadow>
        <sphereGeometry args={[4.0, 28, 16]} />
        <meshStandardMaterial color="#4f7356" roughness={0.95} />
      </mesh>
      {/* trees */}
      {[
        [-12, 5],
        [11, 6.5],
        [-4, 9],
        [13, -4],
        [-14, -5],
        [8, 9],
        [-10, 8],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.11, 0.16, 1.8, 10]} />
            <meshStandardMaterial color="#5d4037" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 2.15, 0]}>
            <sphereGeometry args={[0.85, 20, 16]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#3f6b46' : '#4a7a52'} roughness={0.88} />
          </mesh>
        </group>
      ))}
      {theme.cloudOpacity > 0.2 && (
        <>
          <Cloud position={[-8, 10, -10]} opacity={theme.cloudOpacity * 0.55} speed={0.12} segments={20} />
          <Cloud position={[9, 11, -12]} opacity={theme.cloudOpacity * 0.45} speed={0.08} segments={24} />
        </>
      )}
      {theme.showStars && <Stars radius={60} depth={45} count={1400} factor={2.5} fade speed={0.4} />}
      <Rain active={theme.showRain} />
    </>
  );
}

function Campus({ theme }: { theme: WeatherTheme }) {
  const showTitle = useGame((s) => !s.state || s.state.phase === 'title');
  const company = useInteractive('company');
  const market = useInteractive('market');
  const bank = useInteractive('bank');
  const hospital = useInteractive('hospital');
  const realty = useInteractive('realestate');

  return (
    <>
      <color attach="background" args={[theme.skyTop]} />
      <fog attach="fog" args={[theme.fog, 16, 48]} />
      <ambientLight intensity={0.35} color={theme.ambient} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, 0.55]} />
      <directionalLight
        castShadow
        intensity={theme.sunIntensity}
        position={[10, 14, 6]}
        color={theme.sunColor}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight intensity={0.25} position={[-6, 4, -4]} color="#a8c4e0" />

      {theme.isDay && !theme.showRain && (
        <Sky
          sunPosition={[8, theme.kind === 'clear' ? 6 : 3, 2]}
          turbidity={theme.kind === 'clear' ? 4 : 8}
          rayleigh={theme.kind === 'clear' ? 1.2 : 0.6}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}
      <Environment preset={theme.isDay ? 'city' : 'night'} environmentIntensity={0.45} />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[36, 72]} />
        <meshStandardMaterial color={theme.ground} roughness={0.95} metalness={0.02} />
      </mesh>
      {/* bay water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18, -0.04, 12]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshPhysicalMaterial
          color={theme.water}
          roughness={0.15}
          metalness={0.2}
          transmission={0.15}
          thickness={0.5}
        />
      </mesh>
      {/* asphalt path network */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.4]} receiveShadow>
        <planeGeometry args={[2.0, 22]} />
        <meshStandardMaterial color="#4a4a48" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.015, 1.5]} receiveShadow>
        <planeGeometry args={[1.6, 18]} />
        <meshStandardMaterial color="#4a4a48" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.4]}>
        <planeGeometry args={[0.08, 20]} />
        <meshStandardMaterial color="#c4b48a" roughness={0.7} />
      </mesh>

      <group scale={BUILDING_SCALE} position={[-5.6, 0, 1.6]}>
        <OfficeBuilding position={[0, 0, 0]} dim={company.dim} />
      </group>
      <group scale={BUILDING_SCALE} position={[5.4, 0, 3.2]}>
        <MarketBuilding position={[0, 0, 0]} dim={market.dim} />
      </group>
      <group scale={BUILDING_SCALE} position={[0.2, 0, -5.2]}>
        <BankBuilding position={[0, 0, 0]} dim={bank.dim} />
      </group>
      <group scale={BUILDING_SCALE} position={[-8.2, 0, -3.0]}>
        <HospitalBuilding position={[0, 0, 0]} dim={hospital.dim} />
      </group>
      <group scale={BUILDING_SCALE} position={[8.0, 0, -2.0]}>
        <RealtyHouse position={[0, 0, 0]} dim={realty.dim} />
      </group>

      {!showTitle && <EngineerAvatar />}
      {!showTitle && <CharacterNpcs />}
      <Nature theme={theme} />
      <ContactShadows opacity={0.45} scale={48} blur={2.8} far={16} color="#1a2420" />
      <PerspectiveCam />
    </>
  );
}

function PerspectiveCam() {
  const phase = useGame((s) => s.state?.phase);
  useFrame(({ camera, clock }) => {
    const title = !phase || phase === 'title';
    const targetY = title ? 8.5 : 11.5;
    const targetZ = title ? 18 : 22;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.03);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.03);
    camera.position.x = Math.sin(clock.elapsedTime * 0.08) * (title ? 0.5 : 1.1);
    camera.lookAt(0, 0.8, 0);
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
        camera={{ position: [0, 8.5, 18], fov: 40, near: 0.1, far: 120 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Campus theme={theme} />
      </Canvas>
    </div>
  );
}
