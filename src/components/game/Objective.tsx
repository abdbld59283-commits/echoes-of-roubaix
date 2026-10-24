import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function Objective({
  position,
  color = "#7de2ff",
  onReach,
  playerPos,
  visible = true,
  allies,
}: {
  position: [number, number, number];
  color?: string;
  onReach: () => boolean | void;
  playerPos: THREE.Vector3;
  visible?: boolean;
  allies?: React.RefObject<Map<number, THREE.Vector3>> | undefined;
}) {
  const group = useRef<THREE.Group>(null);
  const done = useRef(false);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (g) { g.rotation.y += delta * 1.2; g.position.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.18; }

    if (!done.current) {
      const dx = playerPos.x - position[0];
      const dz = playerPos.z - position[2];
      const close = Math.hypot(dx, dz);
      const helper = close < 6 && [...(allies?.current.values() ?? [])].some(p => Math.hypot(p.x - position[0], p.z - position[2]) < 1.6);
      if (close < 1.6 || helper) {
        done.current = onReach() !== false;
      }
    }
  });

  return (
    <group visible={visible}>
      <pointLight
        position={[position[0], 2.2, position[2]]}
        color={color}
        intensity={6}
        distance={14}
      />
      <group ref={group} position={position}>
        <mesh castShadow>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.4}
            roughness={0.2}
          />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.95, 0]}>
          <ringGeometry args={[1.1, 1.45, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[position[0], 6, position[2]]}>
        <cylinderGeometry args={[0.12, 0.12, 10, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
