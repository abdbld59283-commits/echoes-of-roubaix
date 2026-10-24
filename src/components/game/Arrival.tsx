import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Survivor } from "./SurvivorCamp";
import { TEAM_SIZE } from '@/game/expedition';
import { useState } from 'react';
import * as THREE from 'three';

export function Arrival({ onFinish, survivors = TEAM_SIZE }: { onFinish: () => void; survivors?: number }) {
  const elapsed = useRef(0);
  const finished = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const walkers = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ camera }, rawDelta) => {
    elapsed.current += Math.min(rawDelta, 0.05);
    const t = elapsed.current;
    walkers.current.forEach((g, i) => { if (g) { g.position.z = 15 + Math.floor(i / 5) * 2 - Math.min(t, 4) * 1.4; g.rotation.y = t > 6 ? Math.sin(t * 0.3 + i) * 0.35 : Math.PI; } });
    if (t > 5 && !revealed) setRevealed(true);
    if (t < 5) {
      const p = t / 5;
      camera.position.set(12 - p * 7, 16 - p * 12, 28 - p * 7);
      camera.lookAt(0, 5, -20);
    } else {
      const p = Math.min(1, (t - 5) / 9);
      if (p < 0.5) { camera.position.set(7 - p * 12, 2.1, 6); camera.lookAt(0, 1.3, 11); }
      else { camera.position.set(-2, 3 + (p - 0.5) * 18, 22); camera.lookAt(0, 7, -20); }
    }
    if (t >= 14 && !finished.current) { finished.current = true; onFinish(); }
  });
  return <>{Array.from({ length: survivors }, (_, i) => <group key={i} ref={g => { walkers.current[i] = g; }} position={[(i % 5 - 2) * 1.8, 0, 15 + Math.floor(i / 5) * 2]}><Survivor person={i % 3} position={[0, 0, 0]} animation={revealed ? 'emote-yes' : 'walk'} discover={revealed} /></group>)}</>;
}