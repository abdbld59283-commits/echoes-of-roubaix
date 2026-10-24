import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { threatPulse } from "@/game/audio";
import { closestThreat, type AttackView, type Threat } from "@/game/threat";

export function ThreatMonitor({ threats, attack, onChase }: {
  threats: React.RefObject<Map<string, Threat>>;
  attack: React.RefObject<AttackView | null>;
  onChase: (chasing: boolean) => void;
}) {
  const nextPulse = useRef(0);
  const previous = useRef(false);
  useFrame(() => {
    const threat = closestThreat(threats.current.values());
    const chasing = !attack.current && threat.chasing;
    if (previous.current !== chasing) {
      previous.current = chasing;
      onChase(chasing);
    }
    const now = performance.now();
    if (!attack.current && threat.distance < 22 && now >= nextPulse.current) {
      threatPulse(threat.distance, chasing);
      nextPulse.current = now + (chasing ? 370 : 950);
    }
  });
  return null;
}