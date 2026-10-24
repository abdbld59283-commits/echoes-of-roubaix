import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { FireState } from "./Campfires";
import { cellToWorld, isSolid, type World } from "@/game/maze";
import { monsterThreat, type AttackView, type Threat } from "@/game/threat";
import type { Target } from "@/game/combat";
import { bossPower, BOSS_BASE_HP, BRIGAND_RANGE, BRIGAND_FIRE_DELAY } from "@/game/expedition";
import { AssetModel } from "./AssetModel";

interface MonsterProps {
  world: World;
  cell: { x: number; z: number };
  speed: number;
  playerPos: THREE.Vector3;
  onCatch: (position: THREE.Vector3) => boolean;
  id: string;
  threats: React.RefObject<Map<string, Threat>>;
  attack: React.RefObject<AttackView | null>;
  pale?: boolean;
  fires?: React.RefObject<FireState[]> | undefined;
  targets: React.RefObject<Map<string, Target>>;
  onKill: () => void;
  kind?: "roamer" | "boss" | "brigand";
  active?: boolean;
  onShootPlayer?: () => void;
  allies?: React.RefObject<Map<number, THREE.Vector3>>;
  allyHits?: React.RefObject<Map<number, () => void>>;
  onBoss?: (status: { hp: number; maxHp: number; level: number; next: number }) => void;
}

const TMP = new THREE.Vector3();

export function Monster({ world, cell, speed, playerPos, onCatch, pale, fires, id, threats, attack, targets, onKill, kind = "roamer", active = true, onBoss, onShootPlayer, allies, allyHits }: MonsterProps) {
  const group = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const start = useMemo(() => cellToWorld(world.size, cell.x, cell.z), [world, cell]);
  const pos = useRef(new THREE.Vector3(start.x, 0, start.z));
  const wander = useRef(Math.random() * Math.PI * 2);
  const cooldown = useRef(0);
  const retreat = useRef(false);
  const dead = useRef(false);
  const hp = useRef(kind === "boss" ? BOSS_BASE_HP : kind === "brigand" ? 3 : 1);
  const elapsed = useRef(0);
  const level = useRef(1);
  const reported = useRef(-1);
  const fireTimer = useRef(1 + Math.random() * 2);
  const muzzle = useRef<THREE.Mesh>(null);
  const muzzleT = useRef(0);
  useEffect(() => {
    const registry = threats.current;
    const targetRegistry = targets.current;
    const object = group.current;
    if (object) targetRegistry.set(id, { object, kind, hit: (damage = 1) => {
      if (dead.current || attack.current) return;
      hp.current = Math.max(0, hp.current - damage);
      reported.current = -1;
      if (hp.current > 0) return;
      dead.current = true; object.visible = false;
      registry.delete(id); targetRegistry.delete(id); onKill();
      if (kind === "boss") onBoss?.({ hp: 0, maxHp: bossPower(elapsed.current).maxHp, level: level.current, next: 0 });
    } });
    return () => { registry.delete(id); targetRegistry.delete(id); };
  }, [id, threats, targets, attack, onKill, kind, onBoss]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g || dead.current || !active) return;
    const t = state.clock.elapsedTime;
    if (attack.current) {
      g.lookAt(playerPos.x, 0, playerPos.z);
      if (armL.current) armL.current.rotation.x = -1.4;
      if (armR.current) armR.current.rotation.x = -1.4;
      if (body.current) body.current.rotation.z = Math.sin(t * 30) * 0.05;
      return;
    }
    if (kind === "boss") {
      elapsed.current += rawDelta;
      const power = bossPower(elapsed.current);
      if (power.level > level.current) { hp.current += power.maxHp - bossPower((level.current - 1) * 60).maxHp; level.current = power.level; }
      if (reported.current !== Math.floor(elapsed.current)) {
        reported.current = Math.floor(elapsed.current);
        onBoss?.({ hp: hp.current, maxHp: power.maxHp, level: power.level, next: 60 - Math.floor(elapsed.current % 60) });
      }
    }
    if (retreat.current) {
      pos.current.set(start.x, 0, start.z);
      retreat.current = false;
    }

    const dist = pos.current.distanceTo(playerPos);
    const hunting = dist < (kind === "boss" ? 24 : 15);

    // A flaring hearth near the monster scares it away.
    const now = performance.now();
    let fleeing = false;
    for (const f of fires?.current ?? []) {
      if (f.until < now) continue;
      const fd = Math.hypot(pos.current.x - f.x, pos.current.z - f.z);
      if (fd < 12) {
        fleeing = true;
        TMP.set(pos.current.x - f.x, 0, pos.current.z - f.z).normalize();
        break;
      }
    }

    threats.current.set(id, monsterThreat(dist, fleeing));
    if (fleeing) {
      // direction already set
    } else if (hunting && kind === "brigand" && dist < 7) {
      TMP.set(0, 0, 0);
    } else if (hunting) {
      TMP.copy(playerPos).sub(pos.current);
      TMP.y = 0;
      TMP.normalize();
    } else {
      wander.current += (Math.random() - 0.5) * delta * 2;
      TMP.set(Math.cos(wander.current), 0, Math.sin(wander.current));
    }

    const currentSpeed = kind === "boss" ? bossPower(elapsed.current).speed : speed;
    const step = (fleeing ? currentSpeed * 1.1 : hunting ? currentSpeed * 0.85 : currentSpeed * 0.4) * delta;
    const nx = pos.current.x + TMP.x * step;
    const nz = pos.current.z + TMP.z * step;
    if (!isSolid(world, nx, pos.current.z)) pos.current.x = nx;
    else wander.current += 1.7;
    if (!isSolid(world, pos.current.x, nz)) pos.current.z = nz;
    else wander.current += 1.7;

    g.position.set(pos.current.x, 0, pos.current.z);
    g.lookAt(playerPos.x, 0, playerPos.z);

    // Horrific idle: flailing arms, twitching stretch, faster when close.
    const rage = hunting ? 1 + (15 - dist) / 6 : 0.5;
    if (armL.current) armL.current.rotation.x = Math.sin(t * 6 * rage) * 1.3 - 0.4;
    if (armR.current) armR.current.rotation.x = Math.sin(t * 6 * rage + 2.1) * 1.3 - 0.4;
    if (body.current) {
      body.current.scale.y = (kind === "boss" ? 1.3 : 1) * (1 + Math.sin(t * 9 * rage) * 0.06 * rage);
      body.current.rotation.z = Math.sin(t * 3.3 * rage) * 0.09;
      body.current.position.y = Math.abs(Math.sin(t * 5 * rage)) * 0.12;
    }

    if (kind === "brigand") {
      // Brigands shoot the closest visible person: the player or a survivor.
      fireTimer.current -= delta; muzzleT.current -= delta;
      if (muzzle.current) muzzle.current.visible = muzzleT.current > 0;
      if (fireTimer.current <= 0) {
        let best: { x: number; z: number; d: number; ally?: number } | undefined;
        const consider = (x: number, z: number, ally?: number) => {
          const d = Math.hypot(x - pos.current.x, z - pos.current.z);
          if (d > BRIGAND_RANGE || (best && d >= best.d)) return;
          for (let s = 0.5; s < d; s += 0.5) if (isSolid(world, pos.current.x + (x - pos.current.x) * s / d, pos.current.z + (z - pos.current.z) * s / d)) return;
          best = { x, z, d, ...(ally !== undefined ? { ally } : {}) };
        };
        consider(playerPos.x, playerPos.z);
        for (const [i, a] of allies?.current ?? []) consider(a.x, a.z, i);
        if (best) {
          fireTimer.current = BRIGAND_FIRE_DELAY;
          muzzleT.current = 0.12;
          g.lookAt(best.x, 0, best.z);
          if (Math.random() < 0.55) {
            if (best.ally === undefined) onShootPlayer?.();
            else allyHits?.current.get(best.ally)?.();
          }
        } else fireTimer.current = 0.4;
      }
      return;
    }

    cooldown.current -= delta;
    if (!fleeing && dist < 1.5 && cooldown.current <= 0) {
      cooldown.current = 2.5;
      // Hold the actual attacker in place for the face-to-face death scene.
      if (onCatch(pos.current)) retreat.current = true;
    }
  });

  const skin = pale ? "#b9c6d6" : "#2b2320";

  return (
    <group ref={group} position={[start.x, 0, start.z]}>
      {kind === "brigand" ? <group><AssetModel model="narek" height={1.9} /><AssetModel model="pistol" height={0.25} position={[0.35, 1.2, 0.3]} /><mesh ref={muzzle} visible={false} position={[0.35, 1.25, 0.6]}><sphereGeometry args={[0.1, 6, 6]} /><meshBasicMaterial color="#ffd27d" /></mesh></group> : <group ref={body} scale={kind === "boss" ? [1.8, 1.3, 1.8] : [1, 1, 1]}>
        {/* legs */}
        <mesh position={[-0.22, 0.75, 0]}>
          <capsuleGeometry args={[0.12, 1.3, 4, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        <mesh position={[0.22, 0.75, 0]}>
          <capsuleGeometry args={[0.12, 1.3, 4, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        {/* torso */}
        <mesh position={[0, 1.95, 0]}>
          <capsuleGeometry args={[0.3, 1.1, 6, 10]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
        {/* head */}
        <mesh position={[0, 2.75, 0]}>
          <sphereGeometry args={[0.26, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* eyes */}
        <mesh position={[-0.1, 2.78, 0.22]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color="#ffe9a8" emissive="#ffcc44" emissiveIntensity={4} />
        </mesh>
        <mesh position={[0.1, 2.78, 0.22]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color="#ffe9a8" emissive="#ffcc44" emissiveIntensity={4} />
        </mesh>
        {/* long arms */}
        <mesh ref={armL} position={[-0.42, 2.3, 0]}>
          <capsuleGeometry args={[0.09, 1.9, 4, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        <mesh ref={armR} position={[0.42, 2.3, 0]}>
          <capsuleGeometry args={[0.09, 1.9, 4, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
      </group>}
    </group>
  );
}
