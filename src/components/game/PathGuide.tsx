import { useMemo } from "react";
import { cellToWorld, routeToGoal, type World } from "@/game/maze";
import { useScenePalette } from "@/game/scenePalette";

export function PathGuide({ world }: { world: World }) {
  const points = useMemo(() => routeToGoal(world).map(p => cellToWorld(world.size, p.x, p.z)), [world]);
  const palette = useScenePalette();
  if (!palette) return null;
  return <group>{points.slice(1).map((p, i) => <mesh key={i} position={[p.x, 0.025, p.z]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.15, 0.3, 12]} /><meshBasicMaterial color={palette.signal} /></mesh>)}</group>;
}