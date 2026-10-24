import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Survivor } from "./SurvivorCamp";

export function Arrival({ onFinish }: { onFinish: () => void }) {
  const elapsed = useRef(0);
  const finished = useRef(false);
  useFrame(({ camera }, rawDelta) => {
    elapsed.current += Math.min(rawDelta, 0.05);
    const t = elapsed.current;
    if (t < 5) {
      const angle = -0.6 + t * 0.23;
      camera.position.set(Math.sin(angle) * 6, 2.2, 10 + Math.cos(angle) * 6);
      camera.lookAt(0, 1.25, 10);
    } else {
      const p = Math.min(1, (t - 5) / 7);
      camera.position.set(5 - p * 5, 3 + p * 8, 18 - p * 6);
      camera.lookAt(0, 3.5, -15);
    }
    if (t >= 12 && !finished.current) { finished.current = true; onFinish(); }
  });
  return <>{[0, 1, 2].map(i => <Survivor key={i} person={i} position={[(i - 1) * 2, 0, 10]} discover />)}</>;
}