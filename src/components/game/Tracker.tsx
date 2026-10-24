import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/** Reports distance to the objective a few times a second (cheap HUD updates). */
export function Tracker({
  playerPos,
  goal,
  onUpdate,
}: {
  playerPos: THREE.Vector3;
  goal: [number, number, number];
  onUpdate: (distance: number) => void;
}) {
  const acc = useRef(0);
  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 0.2) return;
    acc.current = 0;
    onUpdate(Math.hypot(playerPos.x - goal[0], playerPos.z - goal[2]));
  });
  return null;
}
