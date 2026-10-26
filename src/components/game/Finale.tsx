import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Survivor } from "./SurvivorCamp";
import { TEAM_SIZE } from "@/game/expedition";

const DURATION = 16;
/** Victory cinematic: the whole team marches onto the Grand-Place under a clear sky. */
export function Finale({ survivors = TEAM_SIZE, onFinish }: { survivors?: number; onFinish: () => void }) {
  const elapsed = useRef(0), done = useRef(false);
  const started = useRef<number | null>(null);
  const walkers = useRef<(THREE.Group | null)[]>([]);
  const count = Math.max(0, survivors);
  const [arrived, setArrived] = useState(false);
  useFrame(({ camera, clock }, raw) => {
    if (started.current === null) started.current = performance.now();
    elapsed.current = (performance.now() - started.current) / 1000;
    const t = elapsed.current;
    walkers.current.forEach((g, i) => {
      if (!g) return;
      const row = Math.floor(i / 5), col = (i % 5) - 2;
      const targetZ = 2 + row * 2.2;
      const z = Math.max(targetZ, 20 + row * 2.2 - t * 2);
      g.position.set(col * 1.8, 0, z);
      g.rotation.y = Math.PI;
    });
    if (t >= 9 && !arrived) setArrived(true);
    const p = THREE.MathUtils.smoothstep(Math.min(1, t / DURATION), 0, 1);
    camera.position.set(10 * (1 - p), 2.4 + 9 * p * p, 22 + 6 * p);
    camera.lookAt(0, 1.4 + 6.6 * p, 10 - 28 * p);
    if (t >= DURATION && !done.current) { done.current = true; onFinish(); }
  });
  return <>{Array.from({ length: count }, (_, i) => <group key={i} ref={el => { walkers.current[i] = el; }} position={[0, 0, 40]}><Survivor person={i % 3} position={[0, 0, 0]} animation={arrived ? 'idle' : 'walk'} discover={arrived} /></group>)}</>;
}
