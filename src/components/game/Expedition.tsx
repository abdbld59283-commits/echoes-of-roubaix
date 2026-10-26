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
import { companionJob, type TeamMode, type TeamJob, type JobCandidate } from '@/game/assistance';

interface TeamProps {
  world: World; playerPos: THREE.Vector3; active: boolean; mode: TeamMode; jobs: React.RefObject<Map<number, TeamJob>>;
  targets: React.RefObject<Map<string, Target>>; attack: React.RefObject<AttackView | null>;
  allies: React.RefObject<Map<number, THREE.Vector3>>;
  missionPoints: [number, number, number][];
  resources: React.RefObject<Map<string, { x: number; z: number }>>;
  allyHits: React.RefObject<Map<number, () => void>>;
  supplies: React.RefObject<Map<number, { x: number; z: number }>>;
  onDown: () => void;
}
function Companion({ person, ...props }: TeamProps & { person: number }) {
  const { world, playerPos, active, mode, jobs, targets, attack, allies, resources, allyHits, supplies, onDown } = props;
  const [animation, setAnimation] = useState('idle');
  const lastAnimation = useRef('idle');
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
  const job = useRef<TeamJob | null>(null);
  const facing = useMemo(() => new THREE.Vector3(), []);
  const shotDirection = useMemo(() => new THREE.Vector3(), []);
  const palette = useScenePalette();
  useEffect(() => {
    const registry = allies.current, hits = allyHits.current;
    const assignments = jobs.current;
    registry.set(person, position.current);
    hits.set(person, () => {
      hp.current -= 1; hurt.current = 0.3;
      if (hp.current > 0) return;
      registry.delete(person); hits.delete(person); assignments.delete(person); setDown(true); onDown();
    });
    return () => { registry.delete(person); hits.delete(person); assignments.delete(person); };
  }, [allies, allyHits, jobs, person, onDown]);
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05), group = root.current;
    if (!group || !active || attack.current || down) return;
    const p = position.current;
    let moving = false;
    routing.current -= dt;
    if (routing.current <= 0) {
      routing.current = 0.9 + person * 0.025;
      const candidates: JobCandidate[] = [];
      for (const [key, r] of resources.current) candidates.push({ ...r, key, kind: 'collect' });
      for (const [i, w] of supplies.current) candidates.push({ ...w, key: `weapon-${i}`, kind: 'arm' });
      for (const [key, target] of targets.current) {
        target.object.getWorldPosition(shotDirection);
        candidates.push({ x: shotDirection.x, z: shotDirection.z, key, kind: 'combat', brigand: target.kind === 'brigand' });
      }
      job.current = companionJob(person, armedRef.current, mode, p, playerPos, center, candidates, jobs.current);
      jobs.current.set(person, job.current);
      destination.set(job.current.x, 0, job.current.z);
      if (job.current.kind === 'combat') {
        // Fighters keep a firing distance and flank from different sides.
        const angle = Math.atan2(p.z - destination.z, p.x - destination.x) + (person % 2 ? 0.35 : -0.35);
        destination.x += Math.cos(angle) * 9; destination.z += Math.sin(angle) * 9;
      }
      if (isSolid(world, destination.x, destination.z)) {
        destination.set(job.current.x, 0, job.current.z);
        if (isSolid(world, destination.x, destination.z)) destination.copy(p);
      }
      path.current = mode === 'hold' ? [] : followRoute(world, p, destination);
    }
    const next = path.current[0];
    if (next) {
      moving = walkToward(world, p, next, (job.current?.kind === 'combat' ? 4.8 : 3.3) * dt);
      if (moving) facing.set(next.x, 0, next.z);
      if (Math.hypot(next.x - p.x, next.z - p.z) < 0.25) path.current.shift();
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
          nearest.object.getWorldPosition(shotDirection); shotDirection.y = nearest.kind === "brigand" ? 1 : 1.95;
          origin.copy(p); origin.y = 1.2;
          facing.set(shotDirection.x, 0, shotDirection.z);
          if (shootTarget(world, origin, shotDirection.sub(origin).normalize(), [nearest], 0.5)) pulse.current = 0.15;
        }
      }
    }
    group.position.copy(p);
    if (moving || pulse.current > 0) {
      const yaw = Math.atan2(facing.x - p.x, facing.z - p.z);
      group.rotation.y += Math.atan2(Math.sin(yaw - group.rotation.y), Math.cos(yaw - group.rotation.y)) * (1 - Math.exp(-8 * dt));
    }
    const nextAnimation = pulse.current > 0 ? 'holding-right-shoot' : moving ? job.current?.kind === 'combat' ? 'sprint' : 'walk' : armedRef.current ? 'holding-right' : 'idle';
    if (lastAnimation.current !== nextAnimation) { lastAnimation.current = nextAnimation; setAnimation(nextAnimation); }
    group.scale.setScalar(hurt.current > 0 ? 0.92 : 1);
    if (flash.current) flash.current.visible = pulse.current > 0;
    pulse.current -= dt; hurt.current -= dt;
  });
  if (down) return null;
  return <group ref={root} position={[position.current.x, 0, position.current.z]}>
    <Survivor person={person % 3} position={[0, 0, 0]} animation={animation} />
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