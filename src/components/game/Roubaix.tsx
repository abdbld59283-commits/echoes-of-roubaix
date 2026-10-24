import { Environment, Lightformer, Html } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CELL, at, cellToWorld, type World } from "@/game/maze";
import { asphaltTexture, brickTexture } from "@/game/textures";
import { useScenePalette } from "@/game/scenePalette";
import { AssetModel } from "./AssetModel";

const DUMMY = new THREE.Object3D();
export function Roubaix({ world, clear = false }: { world: World; playerPos: THREE.Vector3; clear?: boolean }) {
  const palette = useScenePalette();
  const brick = useMemo(() => brickTexture(1), []);
  const paving = useMemo(() => asphaltTexture(18), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => {
    const list: [number, number][] = [];
    for (let z = 0; z < world.size; z++) for (let x = 0; x < world.size; x++) if (at(world, x, z)) list.push([x, z]);
    return list;
  }, [world]);
  useLayoutEffect(() => {
    const mesh = meshRef.current; if (!mesh) return;
    cells.forEach(([cx, cz], i) => {
      const p = cellToWorld(world.size, cx, cz);
      const height = 6 + ((cx + cz) % 3) * 1.8;
      DUMMY.position.set(p.x, height / 2, p.z); DUMMY.rotation.set(0, 0, 0); DUMMY.scale.set(1, height / 4, 1); DUMMY.updateMatrix(); mesh.setMatrixAt(i, DUMMY.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, world.size, palette]);
  if (!palette) return null;
  return <>
    <color attach="background" args={[palette.sky]} />
    <fog attach="fog" args={[palette.sky, clear ? 140 : 70, clear ? 320 : 150]} />
    <hemisphereLight args={[palette.sky, palette.stone, clear ? 2.8 : 2]} />
    <directionalLight position={[-25, 35, 20]} color={palette.sun} intensity={clear ? 4.2 : 3} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} />
    <Environment resolution={64}><Lightformer intensity={2} position={[0, 15, 0]} scale={[40, 40, 1]} /><Lightformer color={palette.sky} intensity={1} position={[15, 8, 0]} rotation-y={-Math.PI / 2} scale={[30, 20, 1]} /></Environment>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[world.size * CELL * 1.4, world.size * CELL * 1.4]} /><meshStandardMaterial map={paving} roughness={0.95} color={palette.stone} /></mesh>
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.max(cells.length, 1)]} castShadow receiveShadow><boxGeometry args={[CELL * 0.98, 4, CELL * 0.98]} /><meshStandardMaterial map={brick} roughness={0.8} /></instancedMesh>
    {/* Recognisable civic facade, a deliberately simplified Grand-Place rather than an exact reconstruction. */}
    <group position={[0, 0, -20]}>
      <mesh position={[0, 5.5, 0]} castShadow><boxGeometry args={[22, 11, 4]} /><meshStandardMaterial color={palette.stone} map={brick} /></mesh>
      <mesh position={[0, 12, 0]} castShadow><boxGeometry args={[6, 13, 5]} /><meshStandardMaterial color={palette.stone} /></mesh>
      <mesh position={[0, 20, 0]} castShadow><coneGeometry args={[4.2, 5, 4]} /><meshStandardMaterial color={palette.roof} /></mesh>
      {[-9, -6, -3, 3, 6, 9].map(x => <group key={x} position={[x, 0, 2.1]}>{[4, 8].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[1.2, 2.1, 0.12]} /><meshStandardMaterial color={palette.metal} metalness={0.3} /></mesh>)}</group>)}
      <mesh position={[0, 16, 2.6]} rotation-x={Math.PI / 2}><cylinderGeometry args={[1.2, 1.2, 0.12, 24]} /><meshStandardMaterial color={palette.sun} /></mesh>
      <mesh position={[0, 3, 2.3]}><boxGeometry args={[2.5, 6, 0.12]} /><meshStandardMaterial color={palette.metal} /></mesh>
      <Html position={[0, 8.7, 2.7]} center distanceFactor={18}><span className="camp-name">HÔTEL DE VILLE · ROUBAIX</span></Html>
    </group>
    {[-1, 1].map(side => <group key={side}>{[-12, -4, 4, 12].map((z, i) => <AssetModel key={z} model="house" height={6 + i % 2} position={[side * 23, 0, z]} rotation={[0, side * -Math.PI / 2, 0]} />)}{[-10, 8].map(z => <AssetModel key={`tree-${z}`} model="tree" height={4.5} position={[side * 17, 0, z]} />)}</group>)}
    <Html position={[0, 0.5, 6]} center distanceFactor={15}><span className="camp-name">GRAND-PLACE</span></Html>
  </>;
}
