import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CharacterId } from '../game/types';
import { CHARACTER_META, visibleCharacters } from '../game/characters';
import { useGame } from '../game/store';

const NPC_SLOTS: Record<CharacterId, [number, number, number]> = {
  girlfriend: [-1.8, 0, 4.2],
  wife: [-1.8, 0, 4.2],
  colleague: [-5.5, 0, 2.8],
  boss: [-6.2, 0, 0.2],
  friend: [2.2, 0, 5.0],
};

function NpcFigure({
  id,
  position,
}: {
  id: CharacterId;
  position: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const open = useGame((s) => s.openCharacter);
  const forced = useGame((s) => s.state?.forcedHospital);
  const phase = useGame((s) => s.state?.phase);
  const bond = useGame((s) => s.state?.characters?.[id]);
  const meta = CHARACTER_META[id];

  const blocked =
    !!forced ||
    phase === 'event' ||
    phase === 'gameover' ||
    phase === 'victory' ||
    phase === 'title' ||
    !phase;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 0.42 + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.03;
  });

  if (!bond) return null;

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (!blocked) open(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = blocked ? 'not-allowed' : 'pointer';
        if (ref.current && !blocked) ref.current.scale.setScalar(1.08);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        if (ref.current) ref.current.scale.setScalar(1);
      }}
    >
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.16, 0.34, 6, 12]} />
        <meshStandardMaterial color={meta.outfit} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshStandardMaterial color={meta.color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.5, -0.02]}>
        <sphereGeometry args={[0.175, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color={meta.hair} roughness={0.8} />
      </mesh>
      {/* ground marker ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <ringGeometry args={[0.28, 0.36, 24]} />
        <meshStandardMaterial
          color={meta.outfit}
          emissive={meta.outfit}
          emissiveIntensity={0.25}
          transparent
          opacity={0.7}
        />
      </mesh>
      <Text
        position={[0, 1.05, 0]}
        fontSize={0.22}
        color="#f4f1ea"
        anchorX="center"
        outlineWidth={0.015}
        outlineColor="#12161a"
      >
        {bond.name}
      </Text>
      <Text
        position={[0, 0.82, 0]}
        fontSize={0.14}
        color="#c8d0d6"
        anchorX="center"
        outlineWidth={0.01}
        outlineColor="#12161a"
      >
        {meta.label}
      </Text>
    </group>
  );
}

export function CharacterNpcs() {
  const state = useGame((s) => s.state);
  const show = state && state.phase !== 'title';
  const ids = useMemo(
    () => (state && show ? visibleCharacters(state) : []),
    [state, show],
  );

  if (!show) return null;

  return (
    <group>
      {ids.map((id) => (
        <NpcFigure key={id} id={id} position={NPC_SLOTS[id]} />
      ))}
    </group>
  );
}
