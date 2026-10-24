import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { cellToWorld, type World } from "@/game/maze";

export interface FireState {
  x: number;
  z: number;
  /** performance.now() until which monsters are repelled */
  until: number;
  /** performance.now() when it can flare again */
  ready: number;
}

const TRIGGER = 3.2;
const DURATION = 8000;
const COOLDOWN = 14000;

function Fire({ state }: { state: FireState }) {
  const flame = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const now = performance.now();
    const active = state.until > now;
    const charged = state.ready <= now;
    const base = active ? 1.6 : charged ? 1 : 0.45;
    const f = base * (1 + Math.sin(t * 13 + state.x) * 0.12 + Math.sin(t * 7.3) * 0.08);
    if (flame.current) flame.current.scale.set(f * 0.9, f * 1.4, f * 0.9);
    if (inner.current) inner.current.scale.set(f * 0.5, f * 0.9, f * 0.5);
    if (light.current) {
      light.current.intensity = (active ? 18 : charged ? 7 : 2.5) * (0.85 + Math.random() * 0.3);
      light.current.distance = active ? 24 : 12;
    }
  });

  return (
    <group position={[state.x, 0, state.z]}>
      {/* stone ring */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.7, 0.12, Math.sin(a) * 0.7]} castShadow>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color="#5a5550" roughness={1} />
          </mesh>
        );
      })}
      {/* logs */}
      <mesh position={[0, 0.12, 0]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 1, 6]} />
        <meshStandardMaterial color="#3b2616" roughness={1} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0, -0.7, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 1, 6]} />
        <meshStandardMaterial color="#3b2616" roughness={1} />
      </mesh>
      <mesh ref={flame} position={[0, 0.45, 0]}>
        <coneGeometry args={[0.35, 0.8, 8]} />
        <meshBasicMaterial color="#ff7a1a" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={inner} position={[0, 0.4, 0]}>
        <coneGeometry args={[0.3, 0.7, 8]} />
        <meshBasicMaterial color="#ffd36b" transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.2, 0]} color="#ff9a3c" intensity={7} distance={12} />
    </group>
  );
}

/** Flint hearths: walking close makes them flare and repel the Rôdeurs for a while. */
export function Campfires({
  world,
  playerPos,
  fires,
}: {
  world: World;
  playerPos: THREE.Vector3;
  fires: React.RefObject<FireState[]>;
}) {
  const items = useMemo(
    () =>
      world.fireCells.map((c) => {
        const p = cellToWorld(world.size, c.x, c.z);
        return { x: p.x, z: p.z, until: 0, ready: 0 };
      }),
    [world],
  );
  const list = useRef(items);
  list.current = items;
  fires.current = items;
  useEffect(() => () => void (fires.current = []), [fires]);

  useFrame(() => {
    const now = performance.now();
    for (const f of list.current) {
      if (f.ready > now) continue;
      if (Math.hypot(playerPos.x - f.x, playerPos.z - f.z) < TRIGGER) {
        f.until = now + DURATION;
        f.ready = now + COOLDOWN;
      }
    }
  });

  return (
    <>
      {list.current.map((f, i) => (
        <Fire key={`${world.size}-${i}-${f.x}-${f.z}`} state={f} />
      ))}
    </>
  );
}
