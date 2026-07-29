import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../game/store';

const SPEED = 6;
const SPRINT = 9;

export function PlayerController() {
  const keys = useRef<Record<string, boolean>>({});
  const body = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const setPosition = useGame((s) => s.setPosition);
  const phoneOpen = useGame((s) => s.phoneOpen);
  const dialogue = useGame((s) => s.dialogue);
  const title = useGame((s) => s.title);
  const forced = useGame((s) => s.state?.flags.forcedHospital);
  const spawn = useGame((s) => s.state?.position);

  useEffect(() => {
    if (body.current && spawn) {
      body.current.position.set(spawn[0], spawn[1], spawn[2]);
    }
  }, [spawn?.[0], spawn?.[1], spawn?.[2]]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyP') {
        const st = useGame.getState();
        if (!st.title && !st.dialogue) st.setPhoneOpen(!st.phoneOpen);
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!body.current || title || phoneOpen || dialogue) return;

    const sprint = keys.current['ShiftLeft'] || keys.current['ShiftRight'];
    const speed = (sprint ? SPRINT : SPEED) * (forced ? 0.7 : 1);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const wish = new THREE.Vector3();
    if (keys.current['KeyW'] || keys.current['ArrowUp']) wish.add(forward);
    if (keys.current['KeyS'] || keys.current['ArrowDown']) wish.sub(forward);
    if (keys.current['KeyD'] || keys.current['ArrowRight']) wish.add(right);
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) wish.sub(right);

    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(speed);
      velocity.current.lerp(wish, 1 - Math.exp(-10 * dt));
    } else {
      velocity.current.multiplyScalar(Math.exp(-8 * dt));
    }

    const next = body.current.position.clone().addScaledVector(velocity.current, dt);
    // soft bounds of peninsula slice
    next.x = THREE.MathUtils.clamp(next.x, -55, 55);
    next.z = THREE.MathUtils.clamp(next.z, -55, 55);
    next.y = 0.9;
    body.current.position.copy(next);

    // face move dir
    if (velocity.current.lengthSq() > 0.2) {
      const angle = Math.atan2(velocity.current.x, velocity.current.z);
      body.current.rotation.y = THREE.MathUtils.lerp(body.current.rotation.y, angle, 1 - Math.exp(-8 * dt));
    }

    // third-person follow camera
    const camTarget = body.current.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const back = forward.clone().multiplyScalar(-7.5).add(new THREE.Vector3(0, 4.2, 0));
    const desired = body.current.position.clone().add(back);
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(camTarget);

    // throttle position saves
    if (Math.random() < 0.02) {
      setPosition([next.x, next.y, next.z]);
    }
  });

  return (
    <group ref={body} position={spawn ?? [0, 0.9, 8]}>
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.28, 0.7, 6, 12]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshStandardMaterial color="#d2a679" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.88, -0.02]}>
        <sphereGeometry args={[0.27, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* hoodie accent */}
      <mesh position={[0, 0.15, 0.18]}>
        <boxGeometry args={[0.35, 0.15, 0.08]} />
        <meshStandardMaterial color="#3d5afe" />
      </mesh>
    </group>
  );
}
