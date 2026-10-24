export interface Threat {
  distance: number;
  chasing: boolean;
}

export interface AttackView {
  x: number;
  z: number;
  until: number;
}

export function monsterThreat(distance: number, fleeing: boolean): Threat {
  return { distance: fleeing ? Infinity : distance, chasing: !fleeing && distance < 15 };
}

export function closestThreat(threats: Iterable<Threat>): Threat {
  let distance = Infinity;
  let chasing = false;
  for (const threat of threats) {
    distance = Math.min(distance, threat.distance);
    chasing ||= threat.chasing;
  }
  return { distance, chasing };
}