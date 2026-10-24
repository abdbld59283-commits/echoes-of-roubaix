import { cellToWorld, isSolid, routeToGoal, worldToCell, type World } from "./maze";
import * as THREE from "three";

export const TEAM_SIZE = 19;
export const BRIGAND_COUNT = 10;
export const BOSS_BASE_HP = 32;
export const BOSS_POWER_INTERVAL = 60;
export function bossPower(seconds: number) {
  const level = 1 + Math.floor(Math.max(0, seconds) / BOSS_POWER_INTERVAL);
  return { level, maxHp: BOSS_BASE_HP + (level - 1) * 8, speed: 3.2 + (level - 1) * 0.45 };
}
export function supplyReward(index: number) {
  return { reinforced: index % 3 === 2, rounds: index % 3 === 2 ? 48 : 32 };
}
export function followRoute(world: World, position: THREE.Vector3, destination: THREE.Vector3) {
  const a = worldToCell(world.size, position.x, position.z);
  const b = worldToCell(world.size, destination.x, destination.z);
  return routeToGoal(world, { x: a.cx, z: a.cz }, { x: b.cx, z: b.cz }).slice(1).map(p => cellToWorld(world.size, p.x, p.z));
}
export function walkToward(world: World, position: THREE.Vector3, destination: { x: number; z: number }, step: number) {
  const dx = destination.x - position.x, dz = destination.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return false;
  const move = Math.min(step, distance);
  const x = position.x + dx / distance * move, z = position.z + dz / distance * move;
  if (!isSolid(world, x, position.z)) position.x = x;
  if (!isSolid(world, position.x, z)) position.z = z;
  return true;
}
export const SILEX_REQUIRED = 2;
export const BRIGAND_RANGE = 14;
export const BRIGAND_FIRE_DELAY = 2.2;
export const PLAYER_HIT_POINTS = 4;
export const SURVIVOR_HIT_POINTS = 3;
/** Flint fragments sit on the walkable route so the exit is always reachable after collecting them. */
export function silexCells(world: World) {
  const path = routeToGoal(world);
  if (path.length < 3) return [world.spawn, world.spawn];
  return [0.35, 0.7].map(f => path[Math.floor((path.length - 1) * f)] ?? world.spawn);
}
export function canLeaveTundra(collected: number) { return collected >= SILEX_REQUIRED; }
/** Brigand bullets drain hit points; reaching zero costs one life and refills them. */
export function applyBrigandHit(hp: number) {
  const next = hp - 1;
  return next <= 0 ? { hp: PLAYER_HIT_POINTS, lifeLost: true } : { hp: next, lifeLost: false };
}
