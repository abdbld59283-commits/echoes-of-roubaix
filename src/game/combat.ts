import * as THREE from "three";
import { isSolid, type World } from "./maze";

export const MAGAZINE = 8;
export const SHOT_RANGE = 40;
export interface Target { object: THREE.Object3D; hit: (damage?: number) => void; kind?: "roamer" | "boss" | "brigand" }

/** Hitscan checks the first living target and the grid walls in front of it. */
export function shootTarget(world: World, origin: THREE.Vector3, direction: THREE.Vector3, targets: Iterable<Target>, damage = 1) {
  const ray = new THREE.Raycaster(origin, direction, 0, SHOT_RANGE);
  let best: { target: Target; distance: number } | undefined;
  for (const target of targets) {
    target.object.updateWorldMatrix(true, true);
    const hit = ray.intersectObject(target.object, true)[0];
    if (hit && (!best || hit.distance < best.distance)) best = { target, distance: hit.distance };
  }
  if (!best) return false;
  for (let d = 0.2; d < best.distance; d += 0.2) {
    if (isSolid(world, origin.x + direction.x * d, origin.z + direction.z * d)) return false;
  }
  best.target.hit(damage);
  return true;
}