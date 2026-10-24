import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from '@react-three/drei';
import { useScenePalette } from '@/game/scenePalette';

import { CELL, at, cellToWorld, type World } from "@/game/maze";
import { carpetTexture, ceilingTexture, wallpaperTexture } from "@/game/textures";

const WALL_H = 3.2;
const DUMMY = new THREE.Object3D();

export function Backrooms({ world, playerPos }: { world: World; playerPos: THREE.Vector3 }) {
  const wallpaper = useMemo(() => wallpaperTexture(1), []);
  const carpet = useMemo(() => carpetTexture(28), []);
  const ceiling = useMemo(() => ceilingTexture(22), []);
  const lamp = useRef<THREE.PointLight>(null);
  const flickerLight = useRef<THREE.PointLight>(null);
  const palette = useScenePalette();

  const cells = useMemo(() => {
    const list: [number, number][] = [];
    for (let z = 0; z < world.size; z++)
      for (let x = 0; x < world.size; x++) if (at(world, x, z)) list.push([x, z]);
    return list;
  }, [world]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    cells.forEach(([cx, cz], i) => {
      const p = cellToWorld(world.size, cx, cz);
      DUMMY.position.set(p.x, WALL_H / 2, p.z);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(1, 1, 1);
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = cells.length;
  }, [cells, world.size]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lamp.current) {
      lamp.current.position.set(playerPos.x, 2.7, playerPos.z);
      lamp.current.intensity = 22 + Math.sin(t * 13) * 2;
    }
    if (flickerLight.current) {
      const f = Math.random() < 0.06 ? 0.05 : 1;
      flickerLight.current.position.set(playerPos.x, 3.0, playerPos.z - 6);
      flickerLight.current.intensity = 12 * f;
    }
  });

  const extent = world.size * CELL;
  if (!palette) return null;

  return (
    <>
      <color attach="background" args={[palette.liminal]} />
      <fogExp2 attach="fog" args={[palette.liminal, 0.024]} />
      <ambientLight intensity={1.05} color={palette.lamp} />
      <pointLight ref={lamp} color={palette.lamp} distance={26} decay={1.5} />
      <pointLight ref={flickerLight} color={palette.sun} distance={12} decay={2} />
      <Environment resolution={64}><Lightformer intensity={1.5} color={palette.lamp} position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} /></Environment>

      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[extent, extent]} />
        <meshStandardMaterial map={carpet} bumpMap={carpet} bumpScale={0.045} roughness={0.64} color={palette.carpet} />
      </mesh>
      {/* ceiling */}
      <mesh rotation-x={Math.PI / 2} position-y={WALL_H}>
        <planeGeometry args={[extent, extent]} />
        <meshStandardMaterial map={ceiling} roughness={0.9} color={palette.ceiling} />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(cells.length, 1)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CELL, WALL_H, CELL]} />
        <meshStandardMaterial map={wallpaper} bumpMap={wallpaper} bumpScale={0.035} roughness={0.76} color={palette.wall} />
      </instancedMesh>
      {[world.spawn, world.goal].map((cell, i) => { const p = cellToWorld(world.size, cell.x, cell.z); return <group key={i} position={[p.x, 0, p.z]}><mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.5, 32]} /><meshPhysicalMaterial color={palette.carpet} roughness={0.08} metalness={0.1} clearcoat={1} transparent opacity={0.8} /></mesh><mesh position={[0, 3.14, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[1.3, 0.25]} /><meshStandardMaterial color={palette.lamp} emissive={palette.lamp} emissiveIntensity={3} /></mesh></group>; })}
    </>
  );
}
