import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { AssetModel } from "./AssetModel";
import { cellToWorld, type World } from "@/game/maze";
import { SURVIVORS } from "@/game/survivors";
import { useScenePalette } from "@/game/scenePalette";

export function Survivor({ person, position, discover = false }: { person: number; position: [number, number, number]; discover?: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2 + person) * 0.018;
    if (discover) group.current.rotation.y += (Math.sin(clock.elapsedTime * 0.35 + person) * 0.8 - group.current.rotation.y) * (1 - Math.exp(-2 * Math.min(dt, 0.05)));
  });
  return <group ref={group} position={position}><AssetModel model={person === 0 ? "aela" : person === 1 ? "narek" : "sila"} height={1.75} /></group>;
}

export function SurvivorCamp({ world, playerPos, active, onNear, hidePeople = false }: { world: World; playerPos: THREE.Vector3; active: boolean; onNear: (person: number | null) => void; hidePeople?: boolean }) {
  const last = useRef<number | null>(null);
  const center = world.camp ? cellToWorld(world.size, world.camp.x, world.camp.z) : { x: 0, z: 0 };
  const positions: [number, number, number][] = [[center.x - 3, 0, center.z - 2], [center.x + 3, 0, center.z - 2], [center.x, 0, center.z + 3]];
  useFrame(() => {
    let near: number | null = null;
    if (active) positions.forEach((p, i) => { if (Math.hypot(playerPos.x - p[0], playerPos.z - p[2]) < 3.2) near = i; });
    if (near !== last.current) { last.current = near; onNear(near); }
  });
  if (!world.camp) return null;
  return <group>
    <AssetModel model="tent" height={2.5} position={[center.x - 7, 0, center.z + 1]} rotation={[0, 0.7, 0]} />
    <AssetModel model="tent" height={2.5} position={[center.x + 7, 0, center.z + 1]} rotation={[0, -0.7, 0]} />
    <AssetModel model="bedroll" height={0.18} position={[center.x - 5, 0, center.z - 4]} />
    <AssetModel model="crate" height={0.8} position={[center.x + 5, 0, center.z - 4]} />
    {positions.map((position, i) => <group key={i}>
      {!hidePeople && <Survivor person={i} position={position} />}
      {!hidePeople && <Html position={[position[0], 2.15, position[2]]} center distanceFactor={12}><span className="camp-name">{SURVIVORS[i]?.name}</span></Html>}
    </group>)}
  </group>;
}

export function MissionPickup({ position, playerPos, onCollect, allies }: { position: [number, number, number]; playerPos: THREE.Vector3; onCollect: () => void; allies?: React.RefObject<Map<number, THREE.Vector3>> | undefined }) {
  const mesh = useRef<THREE.Mesh>(null);
  const collected = useRef(false);
  const palette = useScenePalette();
  useFrame(({ clock }, dt) => {
    if (!mesh.current || collected.current) return;
    mesh.current.rotation.y += Math.min(dt, 0.05);
    mesh.current.position.y = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.15;
    const close = (p: THREE.Vector3) => Math.hypot(p.x - position[0], p.z - position[2]) < 1.8;
    if (close(playerPos) || [...(allies?.current.values() ?? [])].some(close)) { collected.current = true; mesh.current.visible = false; onCollect(); }
  });
  if (!palette) return null;
  return <mesh ref={mesh} position={position}><octahedronGeometry args={[0.4]} /><meshStandardMaterial color={palette.signal} emissive={palette.signal} emissiveIntensity={2} /></mesh>;
}