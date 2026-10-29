import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cellToWorld, spawnYaw, type World } from '@/game/maze';
import { useScenePalette } from '@/game/scenePalette';
import { AssetModel } from './AssetModel';
import { Backrooms } from './Backrooms';
import { asphaltTexture } from '@/game/textures';
import { INTRO_DURATION } from '@/game/assistance';

/** One camera owner: ordinary street, noclip fall, recovery, hands, then play. */
const CAR_COLORS = ['#9b2f2a', '#2d4a6b', '#d9d4c7', '#3f3f3f', '#6b7a3a'];
function Car({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.8, 0.6, 4.2]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.35} /></mesh>
    <mesh position={[0, 1.1, -0.2]} castShadow><boxGeometry args={[1.6, 0.55, 2.2]} /><meshStandardMaterial color="#1c2228" metalness={0.8} roughness={0.15} /></mesh>
    {([[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]] as const).map(([x, z], i) => <mesh key={i} position={[x, 0.32, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.32, 0.32, 0.25, 14]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>)}
  </group>;
}

export function Introduction({ world, onFinish }: { world: World; onFinish: () => void }) {
  const elapsed = useRef(0), done = useRef(false), street = useRef<THREE.Group>(null), hands = useRef<THREE.Group>(null);
  const [outside, setOutside] = useState(true);
  const cars = useRef<(THREE.Group | null)[]>([]), walkers = useRef<(THREE.Group | null)[]>([]);
  const palette = useScenePalette();
  const started = useRef<number | null>(null);
  const paving = useMemo(() => asphaltTexture(12), []);
  const playerPos = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => paving.dispose(), [paving]);
  const spawn = cellToWorld(world.size, world.spawn.x, world.spawn.z), yaw = spawnYaw(world);
  useFrame(({ camera }, raw) => {
    if (done.current) return;
    if (started.current === null) started.current = performance.now();
    elapsed.current = (performance.now() - started.current) / 1000;
    const t = elapsed.current * 11 / INTRO_DURATION;
    camera.rotation.order = 'YXZ';
    if (t < 4) {
      camera.position.set(spawn.x + Math.sin(t * 3.5) * 0.018, 41.7 + Math.sin(t * 7) * 0.025, spawn.z + 5 - t * 1.2);
      camera.rotation.set(Math.sin(t * 1.2) * 0.018, Math.sin(t * 0.8) * 0.06, Math.sin(t * 3.5) * 0.006);
    } else if (t < 6.5) {
      const p = Math.min(1, (t - 4) / 2.5);
      camera.position.set(spawn.x + Math.sin(t * 18) * 0.025 * Math.sin(p * Math.PI), 41.7 - p * p * 41.1, spawn.z + 0.2 * (1 - p));
      camera.rotation.set(p * 0.8, yaw * THREE.MathUtils.smoothstep(p, 0, 1), Math.sin(t * 12) * 0.025 * Math.sin(p * Math.PI));
      if (street.current) street.current.visible = false;
    } else {
      const p = Math.min(1, (t - 6.5) / 2);
      camera.position.set(spawn.x, 0.6 + THREE.MathUtils.smoothstep(p, 0, 1) * 1.1, spawn.z);
      const recovery = THREE.MathUtils.smoothstep(p, 0, 1);
      camera.rotation.set(0.8 * (1 - recovery) + (t < 10 ? 0.28 * Math.sin(Math.max(0, Math.min(1, (t - 8) / 2)) * Math.PI) : 0), yaw + Math.sin(Math.max(0, t - 8) * 1.6) * 0.04 * (1 - Math.min(1, Math.max(0, t - 10))), 0);
    }
    const secs = elapsed.current;
    cars.current.forEach((c, i) => { if (c) { const dir = i % 2 ? 1 : -1; c.position.z = ((i * 13 + secs * 9 * dir) % 80 + 120) % 80 - 40; c.rotation.y = dir > 0 ? 0 : Math.PI; } });
    walkers.current.forEach((w, i) => { if (w) { const dir = i % 2 ? 1 : -1; w.position.z = ((i * 7 + secs * 1.3 * dir) % 60 + 90) % 60 - 30; w.rotation.y = dir > 0 ? 0 : Math.PI; } });
    if (outside && t >= 4) setOutside(false);
    if (hands.current) {
      hands.current.visible = t > 8 && t < 10.5;
      hands.current.position.copy(camera.position); hands.current.quaternion.copy(camera.quaternion);
      hands.current.translateY(-1.5); hands.current.translateZ(-0.38);
    }
    if (elapsed.current >= INTRO_DURATION) { done.current = true; onFinish(); }
  });
  if (!palette) return null;
  return <>
    {!outside && <Backrooms world={world} playerPos={playerPos.set(spawn.x, 0, spawn.z)} />}
    {outside && <><color attach="background" args={[palette.sky]} /><fog attach="fog" args={[palette.sky, 70, 200]} /><hemisphereLight args={[palette.sky, palette.stone, 2]} /><directionalLight position={[spawn.x - 10, 65, spawn.z + 10]} intensity={3} color={palette.sun} /></>}
    {outside && <Environment resolution={64}><Lightformer intensity={1.5} position={[0, 5, 0]} scale={[10, 10, 1]} /></Environment>}
    <group ref={street} position={[spawn.x, 40, spawn.z]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[90, 90]} /><meshStandardMaterial map={paving} color={palette.stone} roughness={0.75} /></mesh>
      {[-1, 1].map(side => <group key={side}>{[-14, -5, 4, 13].map(z => <AssetModel key={z} model="house" height={7} position={[side * 12, 0, z]} rotation={[0, side * Math.PI / 2, 0]} />)}<AssetModel model="tree" height={5} position={[side * 7, 0, -8]} />
        {[-30, 22, 30].map(z => <mesh key={`b${z}`} position={[side * 15, 9, z]} castShadow><boxGeometry args={[8, 18, 8]} /><meshStandardMaterial color={z > 0 ? '#8d4a36' : '#b8ab93'} roughness={0.85} /></mesh>)}
        {[-16, -8, 0, 8, 16].map(z => <group key={`l${z}`} position={[side * 6.2, 0, z]}><mesh position={[0, 2, 0]}><cylinderGeometry args={[0.07, 0.09, 4, 8]} /><meshStandardMaterial color="#2b2f33" metalness={0.7} /></mesh><mesh position={[0, 4, 0]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color="#fff3c4" emissive="#ffe9a8" emissiveIntensity={1.5} /></mesh></group>)}
        {[-12, 10].map(z => <mesh key={`bench${z}`} position={[side * 6.8, 0.45, z]}><boxGeometry args={[0.5, 0.12, 1.8]} /><meshStandardMaterial color="#6b4a2f" /></mesh>)}
        <mesh position={[side * 6.4, 0.1, 0]} receiveShadow><boxGeometry args={[2.4, 0.2, 90]} /><meshStandardMaterial color="#9a958c" roughness={0.9} /></mesh>
      </group>)}
      {Array.from({ length: 6 }, (_, i) => <group key={`car${i}`} ref={g => { cars.current[i] = g; }} position={[i % 2 ? 2.2 : -2.2, 0, 0]}><Car color={CAR_COLORS[i % CAR_COLORS.length]!} /></group>)}
      {Array.from({ length: 6 }, (_, i) => <group key={`npc${i}`} ref={g => { walkers.current[i] = g; }} position={[(i % 2 ? 1 : -1) * (5.8 + (i % 3) * 0.5), 0.2, 0]}><AssetModel model={i % 3 === 0 ? 'narek' : 'aela'} height={1.7 + (i % 3) * 0.06} animation="walk" /></group>)}
    </group>
    <group ref={hands} visible={false}><AssetModel model="aela" height={1.75} animation="holding-both" rotation={[0, Math.PI, 0]} /></group>
  </>;
}