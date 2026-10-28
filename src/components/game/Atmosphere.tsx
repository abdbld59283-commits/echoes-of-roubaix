import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useScenePalette } from '@/game/scenePalette';
import { wallClues } from '@/game/journal';
import type { World } from '@/game/maze';

export function Atmosphere({ world, index, playerPos, active, onDiscover }: { world: World; index: number; playerPos: THREE.Vector3; active: boolean; onDiscover: (text: string) => void }) {
  const palette = useScenePalette();
  const dust = useRef<THREE.Points>(null);
  const found = useRef(new Set<string>());
  const clues = useMemo(() => wallClues(world, index), [world, index]);
  const positions = useMemo(() => Float32Array.from({ length: 240 * 3 }, (_, i) => i % 3 === 1 ? ((i * 17 % 97) / 97) * 3 : ((i * 31 % 101) / 101 - 0.5) * 22), []);
  useFrame((_, raw) => {
    if (dust.current) {
      dust.current.position.set(playerPos.x, 0, playerPos.z);
      dust.current.rotation.y += Math.min(raw, 0.05) * 0.015;
    }
    if (!active) return;
    for (const clue of clues) if (!found.current.has(clue.id) && Math.hypot(playerPos.x - clue.position[0], playerPos.z - clue.position[2]) < 3) {
      found.current.add(clue.id); onDiscover(clue.text);
    }
  });
  if (!palette) return null;
  return <>
    <points ref={dust}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={palette.lamp} size={0.025} transparent opacity={0.22} depthWrite={false} /></points>
    {clues.map(clue => <Html key={clue.id} position={clue.position} rotation-y={clue.rotation} transform occlude distanceFactor={3}><p className="wall-trace">{clue.text}</p></Html>)}
  </>;
}