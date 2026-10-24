import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Survivor } from "./SurvivorCamp";
import { TEAM_SIZE } from "@/game/expedition";

const DURATION = 16;
/** Victory cinematic: the whole team marches onto the Grand-Place under a clear sky. */
export function Finale({ survivors = TEAM_SIZE, onFinish }: { survivors?: number; onFinish: () => void }) {
  const elapsed = useRef(0), done = useRef(false);
  const walkers = useRef<(THREE.Group | null)[]>([]);
  const count = Math.max(3, survivors);
  useFrame(({ camera, clock }, raw) => {
    elapsed.current += Math.min(raw, 0.05);
    const t = elapsed.current;
    walkers.current.forEach((g, i) => {
      if (!g) return;
      const row = Math.floor(i / 5), col = (i % 5) - 2;
      const targetZ = 2 + row * 2.2;
      const z = Math.max(targetZ, 30 + row * 2.2 - t * 3.2);
      g.position.set(col * 1.8, z > targetZ ? Math.abs(Math.sin(clock.elapsedTime * 9 + i)) * 0.08 : 0, z);
      // Once arrived, they cheer by hopping and turning toward the town hall.
      if (z <= targetZ && t > 9) g.position.y = Math.abs(Math.sin(clock.elapsedTime * 6 + i * 0.7)) * 0.35;
      g.rotation.y = Math.PI;
    });
    if (t < 8) {
      const a = 0.9 - t * 0.12;
      camera.position.set(Math.sin(a) * 14, 2.4, 14 + Math.cos(a) * 10);
      camera.lookAt(0, 1.4, 10);
    } else {
      const p = Math.min(1, (t - 8) / 7);
      camera.position.set(0, 2.5 + p * 10, 22 + p * 6);
      camera.lookAt(0, 4 + p * 4, -18);
    }
    if (t >= DURATION && !done.current) { done.current = true; onFinish(); }
  });
  return <>{Array.from({ length: count }, (_, i) => <group key={i} ref={el => { walkers.current[i] = el; }} position={[0, 0, 40]}><Survivor person={i % 3} position={[0, 0, 0]} /></group>)}</>;
}
