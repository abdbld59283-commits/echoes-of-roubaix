import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AssetModel } from "./AssetModel";
import { Survivor } from "./SurvivorCamp";
import { cellToWorld, isSolid, type World } from "@/game/maze";
import { followRoute, walkToward, TEAM_SIZE, supplyReward, SURVIVOR_HIT_POINTS } from "@/game/expedition";
import { shootTarget, type Target } from "@/game/combat";
import { useScenePalette } from "@/game/scenePalette";
import type { AttackView } from "@/game/threat";
import { SURVIVORS } from "@/game/survivors";

interface TeamProps {
  world: World; playerPos: THREE.Vector3; active: boolean; following: boolean;
  targets: React.RefObject<Map<string, Target>>; attack: React.RefObject<AttackView | null>;
  allies: React.RefObject<Map<number, THREE.Vector3>>;
  missionPoints: [number, number, number][];
  allyHits: React.RefObject<Map<number, () => void>>;
  supplies: React.RefObject<Map<number, { x: number; z: number }>>;
  onDown: () => void;
}
function Companion({ person, ...props }: TeamProps & { person: number }) {
  const { world, playerPos, active, following, targets, attack, allies, missionPoints, allyHits, supplies, onDown } = props;
  const [armed, setArmed] = useState(person % 3 === 0);
  const armedRef = useRef(armed);
  const [down, setDown] = useState(false);
  const hp = useRef(SURVIVOR_HIT_POINTS);
  const hurt = useRef(0);
  const root = useRef<THREE.Group>(null);
  const center = cellToWorld(world.size, world.camp?.x ?? world.spawn.x, world.camp?.z ?? world.spawn.z);
  const position = useRef(new THREE.Vector3(center.x + (person < 3 ? [-3, 3, 0][person] ?? 0 : (person % 5 - 2) * 2), 0, center.z + (person < 3 ? [-2, -2, 3][person] ?? 0 : 6 + Math.floor(person / 5) * 2)));
  const path = useRef<{ x: number; z: number }[]>([]);
  const routing = useRef(person * 0.08);
  const firing = useRef(person * 0.4);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const destination = useMemo(() => new THREE.Vector3(), []);
  const flash = useRef<THREE.Mesh>(null);
  const pulse = useRef(0);
  const palette = useScenePalette();
  useEffect(() => {
    const registry = allies.current, hits = allyHits.current;
    registry.set(person, position.current);
    hits.set(person, () => {
      hp.current -= 1; hurt.current = 0.3;
      if (hp.current > 0) return;
      registry.delete(person); hits.delete(person); setDown(true); onDown();
    });
    return () => { registry.delete(person); hits.delete(person); };
  }, [allies, allyHits, person, onDown]);
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05), group = root.current;
    if (!group || !active || attack.current || down) return;
    const p = position.current;
    let moving = false;
    if (following) {
      routing.current -= dt;
      if (routing.current <= 0) {
        routing.current = 1.5;
        destination.copy(playerPos);
        const missionPoint = person === 4 ? missionPoints[0] : person === 5 ? missionPoints[1] : undefined;
        // Unarmed survivors go pick up the nearest weapon lying in the snow.
        let weapon: { x: number; z: number } | undefined, best = 30;
        if (!armedRef.current) for (const w of supplies.current.values()) { const d = Math.hypot(w.x - p.x, w.z - p.z); if (d < best) { best = d; weapon = w; } }
        if (weapon) destination.set(weapon.x, 0, weapon.z);
        else if (missionPoint) destination.set(missionPoint[0], 0, missionPoint[2]);
        else {
          const angle = person * 2.4, radius = 4 + Math.floor(person / 6) * 2;
          const x = playerPos.x + Math.cos(angle) * radius, z = playerPos.z + Math.sin(angle) * radius;
          if (!isSolid(world, x, z)) destination.set(x, 0, z);
        }
        path.current = followRoute(world, p, destination);
      }
      const next = path.current[0];
      if (next) {
        moving = walkToward(world, p, next, 7.5 * dt);
        if (Math.hypot(next.x - p.x, next.z - p.z) < 0.25) path.current.shift();
      }
    }
    if (!armedRef.current) for (const [i, w] of supplies.current) {
      if (Math.hypot(w.x - p.x, w.z - p.z) < 1.6) { supplies.current.delete(i); armedRef.current = true; setArmed(true); routing.current = 0; break; }
    }
    {
      firing.current -= dt;
      // Armed survivors defend themselves and the player, even while holding position.
      if (armedRef.current && firing.current <= 0) {
        firing.current = 2.6;
        let nearest: Target | undefined, distance = 18;
        for (const target of targets.current.values()) {
          target.object.getWorldPosition(destination);
          const d = p.distanceTo(destination);
          if (d < distance) { distance = d; nearest = target; }
        }
        if (nearest) {
          nearest.object.getWorldPosition(destination); destination.y = nearest.kind === "brigand" ? 1 : 1.95;
          origin.copy(p); origin.y = 1.2;
          group.lookAt(destination.x, 0, destination.z);
          if (shootTarget(world, origin, destination.sub(origin).normalize(), [nearest], 0.5)) pulse.current = 0.15;
        }
      }
    }
    group.position.copy(p);
    if (moving) { group.lookAt(playerPos.x, 0, playerPos.z); group.position.y = Math.abs(Math.sin(clock.elapsedTime * 10 + person)) * 0.09; }
    pulse.current -= dt; hurt.current -= dt;
    group.scale.setScalar(hurt.current > 0 ? 0.92 : 1);
    if (flash.current) flash.current.visible = pulse.current > 0;
  });
  if (down) return null;
  return <group ref={root} position={[position.current.x, 0, position.current.z]}>
    <Survivor person={person % 3} position={[0, 0, 0]} />
    {person < 3 && <Html position={[0, 2.15, 0]} center distanceFactor={12} zIndexRange={[9, 0]} style={{ pointerEvents: "none" }}><span className="camp-name">{SURVIVORS[person]?.name}</span></Html>}
    {armed && <AssetModel model="pistol" height={0.24} position={[0.35, 1.15, 0.22]} />}
    {palette && <mesh ref={flash} visible={false} position={[0.35, 1.2, 0.5]}><sphereGeometry args={[0.07, 4, 4]} /><meshBasicMaterial color={palette.sun} /></mesh>}
  </group>;
}
export function SurvivorTeam(props: TeamProps & { onNear: (person: number | null) => void }) {
  const last = useRef<number | null>(null);
  useFrame(() => {
    let near: number | null = null;
    if (props.active) for (let i = 0; i < 3; i++) {
      const p = props.allies.current.get(i);
      if (p && p.distanceTo(props.playerPos) < 4.5) near = i;
    }
    if (last.current !== near) { last.current = near; props.onNear(near); }
  });
  return <>{Array.from({ length: TEAM_SIZE }, (_, person) => <Companion key={person} person={person} {...props} />)}</>;
}

export function GroundSupply({ world, cell, index, playerPos, active, onPickup, supplies }: {
  world: World; cell: { x: number; z: number }; index: number; playerPos: THREE.Vector3; active: boolean;
  supplies: React.RefObject<Map<number, { x: number; z: number }>>;
  onPickup: (index: number) => void;
}) {
  const group = useRef<THREE.Group>(null), collected = useRef(false);
  const [gone, setGone] = useState(false);
  const p = cellToWorld(world.size, cell.x, cell.z);
  const palette = useScenePalette();
  useEffect(() => { const map = supplies.current; map.set(index, { x: p.x, z: p.z }); return () => { map.delete(index); }; }, [supplies, index, p.x, p.z]);
  useFrame(() => {
    if (collected.current) return;
    if (!supplies.current.has(index)) { collected.current = true; setGone(true); return; }
    if (!active || Math.hypot(playerPos.x - p.x, playerPos.z - p.z) > 2) return;
    collected.current = true;
    supplies.current.delete(index);
    setGone(true);
    if (group.current) group.current.visible = false;
    onPickup(index);
  });
  if (gone) return null;
  return <group ref={group} position={[p.x, 0, p.z]}>
    <AssetModel model="crate" height={0.35} position={[0.5, 0, 0]} />
    <AssetModel model="pistol" height={0.24} position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} />
    {palette && <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}><ringGeometry args={[0.75, 0.9, 24]} /><meshBasicMaterial color={palette.signal} side={THREE.DoubleSide} /></mesh>}
    <Html position={[0, 0.9, 0]} center distanceFactor={8} zIndexRange={[9, 0]} style={{ pointerEvents: "none" }}><span className="camp-name">{supplyReward(index).reinforced ? "Pistolet renforcé" : "Pistolet"} · +{supplyReward(index).rounds}</span></Html>
  </group>;
}
export function EnemyCamp({ world }: { world: World }) {
  if (!world.enemyCamp) return null;
  const p = cellToWorld(world.size, world.enemyCamp.x, world.enemyCamp.z);
  return <group position={[p.x, 0, p.z]}>
    {[-7, 7].map(x => <AssetModel key={x} model="tent" height={3} position={[x, 0, 0]} rotation={[0, x > 0 ? -0.6 : 0.6, 0]} />)}
    <AssetModel model="crate" height={1.2} position={[0, 0, -6]} />
    <Html position={[0, 4, 0]} center distanceFactor={20} zIndexRange={[9, 0]} style={{ pointerEvents: "none" }}><span className="camp-name enemy-name">CAMP DES BRIGANDS</span></Html>
  </group>;
}