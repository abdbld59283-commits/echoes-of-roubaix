import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Survivor } from "./SurvivorCamp";
import { TEAM_SIZE } from '@/game/expedition';
import { useState } from 'react';
import * as THREE from 'three';

export function Arrival({ onFinish, survivors = TEAM_SIZE }: { onFinish: () => void; survivors?: number }) {
  const elapsed = useRef(0);
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const walkers = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ camera }, rawDelta) => {
    if (started.current === null) started.current = performance.now();
    elapsed.current = (performance.now() - started.current) / 1000;
    const t = elapsed.current;
    walkers.current.forEach((g, i) => { if (g) {
      const delay = (i % 5) * 0.12;
      g.position.z = 15 + Math.floor(i / 5) * 2 - Math.min(Math.max(0, t - delay), 5) * 1.1;
      const yaw = Math.PI + (t > 6 ? Math.sin(t * 0.22 + i) * 0.28 : 0);
      g.rotation.y += Math.atan2(Math.sin(yaw - g.rotation.y), Math.cos(yaw - g.rotation.y)) * (1 - Math.exp(-3 * Math.min(rawDelta, 0.05)));
    } });
    if (t > 5 && !revealed) setRevealed(true);
    if (t < 5) {
      const p = THREE.MathUtils.smoothstep(t / 5, 0, 1);
      camera.position.set(12 - p * 7, 16 - p * 12, 28 - p * 7);
      camera.lookAt(0, THREE.MathUtils.lerp(5, 1.4, p), THREE.MathUtils.lerp(-20, 10, p));
    } else {
      const p = THREE.MathUtils.smoothstep(Math.min(1, (t - 5) / 9), 0, 1);
      camera.position.set(THREE.MathUtils.lerp(5, -5, p), THREE.MathUtils.lerp(4, 8, p), 21 + Math.sin(p * Math.PI) * 3);
      camera.lookAt(0, THREE.MathUtils.lerp(1.4, 7, p), THREE.MathUtils.lerp(10, -20, p));
    }
    if (t >= 14 && !finished.current) { finished.current = true; onFinish(); }
  });
  return <>{Array.from({ length: survivors }, (_, i) => <group key={i} ref={g => { walkers.current[i] = g; }} rotation={[0, Math.PI, 0]} position={[(i % 5 - 2) * 1.8, 0, 15 + Math.floor(i / 5) * 2]}><Survivor person={i % 3} position={[0, 0, 0]} animation={revealed ? 'idle' : 'walk'} discover={revealed} /></group>)}</>;
}