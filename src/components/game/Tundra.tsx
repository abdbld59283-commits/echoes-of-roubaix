import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CELL, at, cellToWorld, worldToCell, type World } from "@/game/maze";
import { iceTexture, snowTexture } from "@/game/textures";

const DUMMY = new THREE.Object3D();

function Blizzard({ playerPos, storm }: { playerPos: THREE.Vector3; storm: boolean }) {
  const count = storm ? 4000 : 1800;
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 18;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, [count]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const p = points.current;
    if (!p) return;
    const attr = p.geometry.attributes["position"];
    const arr = attr?.array as Float32Array | undefined;
    if (!arr || !attr) return;
    const fall = storm ? 16 : 7;
    const wind = storm ? 20 : 6;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] = (arr[i * 3 + 1] ?? 0) - fall * delta;
      arr[i * 3] = (arr[i * 3] ?? 0) + wind * delta;
      if ((arr[i * 3 + 1] ?? 0) < 0) arr[i * 3 + 1] = 18;
      if ((arr[i * 3] ?? 0) > 30) arr[i * 3] = -30;
    }
    attr.needsUpdate = true;
    p.position.set(playerPos.x, 0, playerPos.z);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={storm ? 0.16 : 0.1}
        transparent
        opacity={storm ? 0.95 : 0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function Tundra({
  world,
  playerPos,
  storm = false,
}: {
  world: World;
  playerPos: THREE.Vector3;
  storm?: boolean;
}) {
  const snow = useMemo(() => snowTexture(50), []);
  const ice = useMemo(() => iceTexture(2), []);
  const sun = useRef<THREE.DirectionalLight>(null);

  const cells = useMemo(() => {
    const list: [number, number][] = [];
    for (let z = 0; z < world.size; z++)
      for (let x = 0; x < world.size; x++) if (at(world, x, z)) list.push([x, z]);
    return list;
  }, [world]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lastRegion = useRef("");
  const updateIce = () => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const player = worldToCell(world.size, playerPos.x, playerPos.z);
    const region = `${Math.floor(player.cx / 4)}:${Math.floor(player.cz / 4)}`;
    if (region === lastRegion.current) return;
    lastRegion.current = region;
    let i = 0;
    cells.forEach(([cx, cz]) => {
      if (Math.abs(cx - player.cx) > 24 || Math.abs(cz - player.cz) > 24) return;
      const p = cellToWorld(world.size, cx, cz);
      const h = 2 + ((cx * 31 + cz * 17) % 7) * 0.5;
      DUMMY.position.set(p.x, h / 2 - 0.2, p.z);
      DUMMY.rotation.set(0, ((cx * 13 + cz * 7) % 10) * 0.31, 0);
      DUMMY.scale.set(1, h / 3, 1);
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
      i++;
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = i;
    mesh.computeBoundingSphere();
  };
  useLayoutEffect(() => {
    lastRegion.current = "";
    updateIce();
  }, [cells, world.size]);

  useFrame((state) => {
    updateIce();
    if (sun.current && storm) {
      sun.current.intensity = 1.0 + Math.sin(state.clock.elapsedTime * 9) * 0.25;
    }
  });

  const extent = world.size * CELL;
  const sky = storm ? "#8e9aa8" : "#a9c0d8";

  return (
    <>
      <color attach="background" args={[sky]} />
      <fogExp2 attach="fog" args={[sky, storm ? 0.055 : 0.025]} />
      <hemisphereLight args={["#cfe2f5", "#7d8ea3", storm ? 1.1 : 1.4]} />
      <ambientLight intensity={0.8} color="#bcd2e8" />
      <directionalLight
        ref={sun}
        position={[18, 24, -12]}
        intensity={storm ? 0.6 : 1.3}
        color="#ffe9d0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[extent * 1.4, extent * 1.4]} />
        <meshStandardMaterial map={snow} roughness={0.95} color="#e8f1fa" />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(cells.length, 1)]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[CELL * 0.62, 0]} />
        <meshStandardMaterial map={ice} roughness={0.6} color="#cfe0f0" />
      </instancedMesh>

      <Blizzard playerPos={playerPos} storm={storm} />
    </>
  );
}
