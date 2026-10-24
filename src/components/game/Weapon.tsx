import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { AssetModel } from "./AssetModel";
import { MAGAZINE, shootTarget, type Target } from "@/game/combat";
import type { World } from "@/game/maze";
import { gunshot } from "@/game/audio";
import { useScenePalette } from "@/game/scenePalette";

export interface Ammo { rounds: number; reserve: number; reloading: boolean }
export function Weapon({ world, targets, active, attack, ammo, onAmmo, reinforced = false }: {
  world: World; targets: React.RefObject<Map<string, Target>>; active: boolean;
  attack: React.RefObject<unknown>; ammo: React.RefObject<Ammo>; onAmmo: (value: Ammo) => void;
  reinforced?: boolean;
}) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const muzzle = useRef<THREE.Mesh>(null);
  const recoil = useRef(0);
  const cooldown = useRef(0);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const palette = useScenePalette();
  useEffect(() => {
    const reload = () => {
      if (!active || attack.current || ammo.current.reloading || ammo.current.rounds === MAGAZINE || ammo.current.reserve <= 0) return;
      ammo.current = { ...ammo.current, reloading: true }; onAmmo({ ...ammo.current });
      reloadTimer.current = setTimeout(() => {
        const take = Math.min(MAGAZINE - ammo.current.rounds, ammo.current.reserve);
        ammo.current = { rounds: ammo.current.rounds + take, reserve: ammo.current.reserve - take, reloading: false };
        onAmmo({ ...ammo.current });
      }, 1000);
    };
    const fire = () => {
      if (!active || attack.current || ammo.current.reloading || performance.now() < cooldown.current) return;
      if (ammo.current.rounds <= 0) { reload(); return; }
      ammo.current.rounds--; onAmmo({ ...ammo.current });
      cooldown.current = performance.now() + 260; recoil.current = 1;
      gunshot();
      shootTarget(world, camera.position, camera.getWorldDirection(new THREE.Vector3()), targets.current.values(), reinforced ? 2 : 1);
    };
    const click = (e: MouseEvent) => { if (e.button === 0 && document.pointerLockElement) fire(); };
    const key = (e: KeyboardEvent) => { if (e.repeat) return; if (e.code === "KeyR") reload(); if (e.code === "Space") fire(); };
    window.addEventListener("mousedown", click); window.addEventListener("keydown", key);
    window.addEventListener("echo-fire", fire); window.addEventListener("echo-reload", reload);
    return () => { window.removeEventListener("echo-fire", fire); window.removeEventListener("echo-reload", reload); window.removeEventListener("mousedown", click); window.removeEventListener("keydown", key); clearTimeout(reloadTimer.current); ammo.current.reloading = false; };
  }, [active, attack, ammo, camera, onAmmo, targets, world, reinforced]);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.visible = active && !attack.current;
    recoil.current *= Math.exp(-16 * Math.min(delta, 0.05));
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.translateX(0.3); group.current.translateY(ammo.current.reloading ? -0.65 : -0.34); group.current.translateZ(-0.65 + recoil.current * 0.1);
    if (muzzle.current) muzzle.current.visible = recoil.current > 0.65;
  });
  return <group ref={group}>
    <AssetModel model="pistol" height={0.3} rotation={[0, Math.PI, 0]} position={[0, -0.08, 0]} />
    {palette && <mesh ref={muzzle} position={[0, 0.03, -0.33]} visible={false}><sphereGeometry args={[0.065, 6, 6]} /><meshBasicMaterial color={palette.sun} /></mesh>}
  </group>;
}