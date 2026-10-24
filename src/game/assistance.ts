import type { Quest } from './quests';
import type { World } from './maze';
import { routeToGoal, worldToCell } from './maze';

export interface Resource { x: number; z: number }
export const COMPANION_SCAN_RADIUS = 22;
export const INTRO_DURATION = 20;
export function questAssistance(quest: Pick<Quest, 'id' | 'world'>) {
  return { objective: quest.id !== 2, flint: quest.world === 'tundra' };
}
/** Only living, uncollected resources near the player are eligible for team jobs. */
export function nearbyResource(resources: Iterable<Resource>, player: Resource, companion: Resource) {
  let result: Resource | undefined, best = Infinity;
  for (const resource of resources) {
    if (Math.hypot(resource.x - player.x, resource.z - player.z) > COMPANION_SCAN_RADIUS) continue;
    const distance = Math.hypot(resource.x - companion.x, resource.z - companion.z);
    if (distance < best) { best = distance; result = resource; }
  }
  return result;
}
export function guidanceRoute(world: World, player: Resource, resource: Resource) {
  const a = worldToCell(world.size, player.x, player.z);
  const b = worldToCell(world.size, resource.x, resource.z);
  return routeToGoal(world, { x: a.cx, z: a.cz }, { x: b.cx, z: b.cz });
}
export function openingPhase(index: number, world: Quest['world']) {
  return index === 0 ? 'intro' : world === 'roubaix' ? 'arrival' : 'play';
}