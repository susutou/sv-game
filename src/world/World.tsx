import { Text, ContactShadows, Sky, Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { NpcId, PoiId } from '../game/types';
import { useGame } from '../game/store';
import { PlayerController } from '../player/PlayerController';

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[70, 72]} />
        <meshStandardMaterial color="#4f7348" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[42, -0.05, 20]} receiveShadow>
        <circleGeometry args={[28, 48]} />
        <meshPhysicalMaterial color="#2f6d7c" roughness={0.2} metalness={0.15} />
      </mesh>
      {/* roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[8, 90]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[8, 90]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.9} />
      </mesh>
    </>
  );
}

function Building({
  position,
  size,
  color,
  label,
  poi,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
  poi: PoiId;
}) {
  const interactPoi = useGame((s) => s.interactPoi);
  const setLabel = useGame((s) => s.setInteractLabel);
  const forced = useGame((s) => s.state?.flags.forcedHospital);

  return (
    <group position={position}>
      <mesh
        castShadow
        receiveShadow
        position={[0, size[1] / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = forced && poi !== 'hospital' ? 'not-allowed' : 'pointer';
          setLabel(`E — ${label}`);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          setLabel(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          interactPoi(poi);
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, size[1] + 0.15, 0]}>
        <boxGeometry args={[size[0] * 1.05, 0.25, size[2] * 1.05]} />
        <meshStandardMaterial color="#6a7278" metalness={0.4} roughness={0.35} />
      </mesh>
      <Text position={[0, size[1] + 0.7, 0]} fontSize={0.45} color="#f4f1ea" anchorX="center" outlineWidth={0.02} outlineColor="#111">
        {label}
      </Text>
      {/* invisible interact volume */}
      <mesh visible={false} position={[0, 1, size[2] / 2 + 1.2]}>
        <boxGeometry args={[size[0] + 2, 2.5, 2.5]} />
      </mesh>
    </group>
  );
}

function Npc({
  id,
  position,
  color,
  outfit,
}: {
  id: NpcId;
  position: [number, number, number];
  color: string;
  outfit: string;
}) {
  const talk = useGame((s) => s.talkNpc);
  const name = useGame((s) => s.state?.npcs[id].name ?? id);
  const setLabel = useGame((s) => s.setInteractLabel);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.03;
  });

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        talk(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setLabel(`E — Talk to ${name}`);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        setLabel(null);
      }}
    >
      <mesh castShadow>
        <capsuleGeometry args={[0.22, 0.55, 4, 10]} />
        <meshStandardMaterial color={outfit} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 1.15, 0]} fontSize={0.28} color="#ffeaa7" anchorX="center" outlineWidth={0.015} outlineColor="#111">
        {name}
      </Text>
    </group>
  );
}

function InteractHotkeys() {
  const dialogue = useGame((s) => s.dialogue);
  const phoneOpen = useGame((s) => s.phoneOpen);
  const interactPoi = useGame((s) => s.interactPoi);
  const talk = useGame((s) => s.talkNpc);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || dialogue || phoneOpen) return;
      const label = useGame.getState().interactLabel;
      if (!label) return;
      if (label.includes('Nimbus')) interactPoi('company');
      else if (label.includes('Exchange')) interactPoi('market');
      else if (label.includes('Credit') || label.includes('Bank')) interactPoi('bank');
      else if (label.includes('Care') || label.includes('Hospital')) interactPoi('hospital');
      else if (label.includes('Realty') || label.includes('Home')) interactPoi('housing');
      else if (label.includes('Cafe')) interactPoi('cafe');
      else if (label.includes('Park')) interactPoi('park');
      else if (label.includes('Marcus')) talk('boss');
      else if (label.includes('Priya')) talk('colleague');
      else if (label.includes('Diego')) talk('friend');
      else if (label.includes('Talk to')) talk('partner');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogue, phoneOpen, interactPoi, talk]);

  return null;
}

function TimeSystem() {
  const tick = useGame((s) => s.tick);
  useFrame((_, dt) => {
    // 1 real second ≈ 2.5 in-game minutes → ~1 hour / 24s
    tick((dt * 2.5) / 60);
  });
  return null;
}

export function World() {
  const showPartner = useGame(
    (s) => s.state?.relationship.status === 'dating' || s.state?.relationship.status === 'engaged' || s.state?.relationship.status === 'married',
  );
  const hour = useGame((s) => s.state?.time.hour ?? 12);
  const isDay = hour >= 6 && hour < 19;

  return (
    <>
      <color attach="background" args={[isDay ? '#7eb6d4' : '#0c1424']} />
      <fog attach="fog" args={[isDay ? '#b8cdd8' : '#0c1424', 25, 95]} />
      <ambientLight intensity={isDay ? 0.45 : 0.15} />
      <hemisphereLight args={[isDay ? '#cfe6ff' : '#1a2740', '#3a4a38', 0.55]} />
      <directionalLight
        castShadow
        intensity={isDay ? 1.35 : 0.25}
        position={[20, 30, 10]}
        color={isDay ? '#fff1d0' : '#a8b8d8'}
        shadow-mapSize={[2048, 2048]}
      />
      {isDay && <Sky sunPosition={[40, 20, 10]} turbidity={5} rayleigh={1} />}
      <Environment preset={isDay ? 'city' : 'night'} environmentIntensity={0.35} />

      <Ground />

      <Building position={[-14, 0, -12]} size={[8, 7, 6]} color="#9eb6c4" label="Nimbus Labs" poi="company" />
      <Building position={[16, 0, -8]} size={[7, 5.5, 6]} color="#2f4a3c" label="Exchange Hall" poi="market" />
      <Building position={[16, 0, 14]} size={[6, 4.5, 5]} color="#e4d8bc" label="Credit Union" poi="bank" />
      <Building position={[-18, 0, 16]} size={[6, 5, 6]} color="#f0f2f4" label="Urgent Care" poi="hospital" />
      <Building position={[8, 0, 28]} size={[6, 4, 6]} color="#c4a484" label="Home / Realty" poi="housing" />
      <Building position={[-6, 0, 22]} size={[4, 3, 4]} color="#d7b899" label="Cafe" poi="cafe" />
      <Building position={[28, 0, 6]} size={[3, 0.4, 8]} color="#5a7a52" label="Shoreline Park" poi="park" />

      <Npc id="boss" position={[-10, 0.85, -7]} color="#d4b896" outfit="#263238" />
      <Npc id="colleague" position={[-12, 0.85, -9]} color="#c4a882" outfit="#1565c0" />
      <Npc id="friend" position={[-4, 0.85, 20]} color="#c49a6c" outfit="#2e7d32" />
      {showPartner && <Npc id="partner" position={[6, 0.85, 26]} color="#e8a0b0" outfit="#6a1b9a" />}

      {/* trees */}
      {[[-25, -20], [22, -22], [-30, 10], [32, 18], [-22, 30], [12, -28]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1, 0]}>
            <cylinderGeometry args={[0.2, 0.28, 2, 8]} />
            <meshStandardMaterial color="#5d4037" />
          </mesh>
          <mesh castShadow position={[0, 2.6, 0]}>
            <sphereGeometry args={[1.2, 16, 12]} />
            <meshStandardMaterial color="#3f6b46" />
          </mesh>
        </group>
      ))}

      <PlayerController />
      <InteractHotkeys />
      <TimeSystem />
      <ContactShadows opacity={0.4} scale={120} blur={2.5} far={20} />
    </>
  );
}
