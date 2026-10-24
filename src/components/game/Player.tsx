import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { Look } from "@/game/input";
import { isSolid, type World } from "@/game/maze";
import type { AttackView } from "@/game/threat";

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const RADIUS = 0.45;

export function Player({
  world,
  look,
  keys,
  playerPos,
  shake,
  attack,
  active,
  eye = 1.65,
  speed = 4.6,
}: {
  world: World;
  look: React.RefObject<Look>;
  keys: React.RefObject<Set<string>>;
  playerPos: THREE.Vector3;
  shake: React.RefObject<number>;
  attack: React.RefObject<AttackView | null>;
  active: boolean;
  eye?: number;
  speed?: number;
}) {
  const bob = useRef(0);

  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (attack.current) {
      camera.position.set(playerPos.x, 1.9, playerPos.z);
      camera.lookAt(attack.current.x, 2.65, attack.current.z);
      return;
    }
    const k = keys.current;

    camera.rotation.order = "YXZ";
    camera.rotation.y = look.current.yaw;
    camera.rotation.x = look.current.pitch;
    camera.rotation.z = 0;

    const fwd =
      (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const strafe =
      (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
      (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);

    camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    FORWARD.normalize();
    RIGHT.crossVectors(FORWARD, camera.up).normalize();

    MOVE.set(0, 0, 0).addScaledVector(FORWARD, fwd).addScaledVector(RIGHT, strafe);
    const sprint = k.has("ShiftLeft") || k.has("ShiftRight") ? 1.55 : 1;
    let moving = false;
    if (active && MOVE.lengthSq() > 0) {
      moving = true;
      MOVE.normalize().multiplyScalar(speed * sprint * delta);
      const nx = playerPos.x + MOVE.x;
      const nz = playerPos.z + MOVE.z;
      if (
        !isSolid(world, nx + Math.sign(MOVE.x) * RADIUS, playerPos.z + RADIUS) &&
        !isSolid(world, nx + Math.sign(MOVE.x) * RADIUS, playerPos.z - RADIUS)
      )
        playerPos.x = nx;
      if (
        !isSolid(world, playerPos.x + RADIUS, nz + Math.sign(MOVE.z) * RADIUS) &&
        !isSolid(world, playerPos.x - RADIUS, nz + Math.sign(MOVE.z) * RADIUS)
      )
        playerPos.z = nz;
    }

    bob.current += delta * (moving ? 9 * sprint : 2.2);
    const bobY = Math.sin(bob.current) * (moving ? 0.055 : 0.018);

    let sx = 0;
    let sy = 0;
    if (shake.current > 0.01) {
      sx = (Math.random() - 0.5) * shake.current * 0.5;
      sy = (Math.random() - 0.5) * shake.current * 0.4;
      shake.current *= Math.exp(-3 * delta);
    } else {
      shake.current = 0;
    }

    camera.position.set(playerPos.x + sx, eye + bobY + sy, playerPos.z);
  });

  return null;
}
