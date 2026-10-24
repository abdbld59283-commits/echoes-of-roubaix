import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { cellToWorld, spawnYaw, type World } from '@/game/maze';
import { useScenePalette } from '@/game/scenePalette';
import { AssetModel } from './AssetModel';

/** One camera owner: ordinary street, noclip fall, recovery, hands, then play. */
export function Introduction({ world, onFinish }: { world: World; onFinish: () => void }) {
  const elapsed = useRef(0), done = useRef(false), street = useRef<THREE.Group>(null), hands = useRef<THREE.Group>(null);
  const [outside, setOutside] = useState(true);
  const palette = useScenePalette();
  const spawn = cellToWorld(world.size, world.spawn.x, world.spawn.z), yaw = spawnYaw(world);
  useFrame(({ camera }, raw) => {
    if (done.current) return;
    elapsed.current += Math.min(raw, 0.05);
    const t = elapsed.current;
    camera.rotation.order = 'YXZ';
    if (t < 4) {
      camera.position.set(spawn.x, 41.7 + Math.sin(t * 7) * 0.025, spawn.z + 5 - t * 1.2);
      camera.rotation.set(0, 0, 0);
    } else if (t < 6.5) {
      const p = Math.min(1, (t - 4) / 2.5);
      camera.position.set(spawn.x + Math.sin(t * 80) * 0.055, 41.7 - p * p * 41.1, spawn.z);
      camera.rotation.set(0.2 + p * 0.8, yaw * p, Math.sin(t * 50) * 0.04);
      if (street.current) street.current.visible = false;
    } else {
      const p = Math.min(1, (t - 6.5) / 2);
      camera.position.set(spawn.x, 0.6 + THREE.MathUtils.smoothstep(p, 0, 1) * 1.1, spawn.z);
      camera.rotation.set(t < 10 ? 0.5 * Math.sin(Math.min(1, (t - 8) / 2) * Math.PI) : 0, yaw, 0);
    }
    if (outside && t >= 4) setOutside(false);
    if (hands.current) {
      hands.current.visible = t > 8 && t < 10.5;
      hands.current.position.copy(camera.position); hands.current.quaternion.copy(camera.quaternion);
      hands.current.translateY(-1.35); hands.current.translateZ(-0.42);
    }
    if (t >= 11) { done.current = true; onFinish(); }
  });
  if (!palette) return null;
  return <>
    {outside && <><color attach="background" args={[palette.sky]} /><fog attach="fog" args={[palette.sky, 70, 200]} /><hemisphereLight args={[palette.sky, palette.stone, 2]} /><directionalLight position={[spawn.x - 10, 65, spawn.z + 10]} intensity={3} color={palette.sun} /></>}
    <Environment resolution={64}><Lightformer intensity={1.5} position={[0, 5, 0]} scale={[10, 10, 1]} /></Environment>
    <group ref={street} position={[spawn.x, 40, spawn.z]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[90, 90]} /><meshStandardMaterial color={palette.stone} roughness={0.75} /></mesh>
      {[-1, 1].map(side => <group key={side}>{[-14, -5, 4, 13].map(z => <AssetModel key={z} model="house" height={7} position={[side * 12, 0, z]} rotation={[0, side * Math.PI / 2, 0]} />)}<AssetModel model="tree" height={5} position={[side * 7, 0, -8]} /></group>)}
    </group>
    <group ref={hands} visible={false}><AssetModel model="aela" height={1.75} animation="holding-both" rotation={[0, Math.PI, 0]} /></group>
  </>;
}