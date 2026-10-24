import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AssetModel } from "./AssetModel";
import { cellToWorld, type World } from "@/game/maze";
import { SURVIVORS } from "@/game/survivors";
import { useScenePalette } from "@/game/scenePalette";

export function Survivor({ person, position, discover = false, animation = 'idle' }: { person: number; position: [number, number, number]; discover?: boolean; animation?: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2 + person) * 0.018;
    if (discover) group.current.rotation.y += (Math.sin(clock.elapsedTime * 0.35 + person) * 0.8 - group.current.rotation.y) * (1 - Math.exp(-2 * Math.min(dt, 0.05)));
  });
  return <group ref={group} position={position}><AssetModel model={person === 0 ? "aela" : person === 1 ? "narek" : "sila"} height={1.75} animation={discover ? 'emote-yes' : animation} /></group>;
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

export function MissionPickup({ position, playerPos, onCollect, allies, resources, id, active = true, guided = false }: { position: [number, number, number]; playerPos: THREE.Vector3; onCollect: () => void; allies?: React.RefObject<Map<number, THREE.Vector3>> | undefined; resources?: React.RefObject<Map<string, { x: number; z: number }>>; id?: string; active?: boolean; guided?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const collected = useRef(false);
  const [gone, setGone] = useState(false);
  const palette = useScenePalette();
  useEffect(() => {
    const registry = resources?.current;
    if (id) registry?.set(id, { x: position[0], z: position[2] });
    return () => { if (id) registry?.delete(id); };
  }, [resources, id, position]);
  useFrame(({ clock }, dt) => {
    if (!mesh.current || collected.current || !active) return;
    mesh.current.rotation.y += Math.min(dt, 0.05);
    mesh.current.position.y = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.15;
    const close = (p: THREE.Vector3) => Math.hypot(p.x - position[0], p.z - position[2]) < 1.8;
    if (close(playerPos) || [...(allies?.current.values() ?? [])].some(close)) { collected.current = true; mesh.current.visible = false; if (id) resources?.current.delete(id); setGone(true); onCollect(); }
  });
  if (!palette || gone) return null;
  return <group><mesh ref={mesh} position={position}><octahedronGeometry args={[0.4]} /><meshStandardMaterial color={guided ? palette.signal : palette.stone} emissive={guided ? palette.signal : palette.stone} emissiveIntensity={guided ? 2 : 0.1} roughness={0.45} /></mesh>{guided && <><mesh position={[position[0], 3, position[2]]}><cylinderGeometry args={[0.08, 0.2, 5, 8, 1, true]} /><meshBasicMaterial color={palette.signal} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} /></mesh><mesh position={[position[0], 0.03, position[2]]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.7, 0.95, 24]} /><meshBasicMaterial color={palette.signal} transparent opacity={0.8} /></mesh><Html position={[position[0], 1.5, position[2]]} center distanceFactor={12}><span className="camp-name">SILEX</span></Html></>}</group>;
}