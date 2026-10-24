import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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

  return (
    <>
      <color attach="background" args={["#0d0b05"]} />
      <fogExp2 attach="fog" args={["#3a3014", 0.04]} />
      <ambientLight intensity={1.2} color="#e8d08a" />
      <pointLight ref={lamp} color="#ffdf9b" distance={26} decay={1.5} />
      <pointLight ref={flickerLight} color="#fff1bb" distance={12} decay={2} />

      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[extent, extent]} />
        <meshStandardMaterial map={carpet} roughness={1} color="#a89042" />
      </mesh>
      {/* ceiling */}
      <mesh rotation-x={Math.PI / 2} position-y={WALL_H}>
        <planeGeometry args={[extent, extent]} />
        <meshStandardMaterial map={ceiling} roughness={1} color="#c8bd94" />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(cells.length, 1)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CELL, WALL_H, CELL]} />
        <meshStandardMaterial map={wallpaper} roughness={0.95} color="#d8bc61" />
      </instancedMesh>
    </>
  );
}
