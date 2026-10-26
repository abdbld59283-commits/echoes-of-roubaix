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

export type TeamMode = 'autonomous' | 'follow' | 'hold';
export interface TeamJob extends Resource { key: string; kind: 'collect' | 'arm' | 'combat' | 'patrol' | 'follow' | 'hold' }
export interface JobCandidate extends Resource { key: string; kind: 'collect' | 'arm' | 'combat'; brigand?: boolean }
/** Each resource has one worker; enemies allow two fighters, never the entire team. */
export function companionJob(person: number, armed: boolean, mode: TeamMode, position: Resource, player: Resource, home: Resource, candidates: JobCandidate[], jobs: ReadonlyMap<number, TeamJob>): TeamJob {
  if (mode === 'hold') return { ...position, key: `hold-${person}`, kind: 'hold' };
  let selected: JobCandidate | undefined, score = Infinity;
  for (const candidate of candidates) {
    if (candidate.kind === 'arm' && armed || candidate.kind === 'combat' && !armed) continue;
    const assigned = [...jobs].filter(([id, job]) => id !== person && job.key === candidate.key).length;
    if (assigned >= (candidate.kind === 'combat' ? 2 : 1)) continue;
    const distance = Math.hypot(candidate.x - position.x, candidate.z - position.z);
    if (mode === 'follow' && Math.hypot(candidate.x - player.x, candidate.z - player.z) > COMPANION_SCAN_RADIUS) continue;
    if (candidate.kind === 'combat' && distance > 65) continue;
    const priority = candidate.kind === 'arm' ? -80 : candidate.kind === 'combat' ? (candidate.brigand ? -45 : -15) : person % 3 === 0 ? -65 : -25;
    if (distance + priority < score) { score = distance + priority; selected = candidate; }
  }
  if (selected) return selected;
  if (mode === 'follow') {
    const angle = person * 2.4, radius = 5 + Math.floor(person / 6) * 2;
    return { x: player.x + Math.cos(angle) * radius, z: player.z + Math.sin(angle) * radius, key: `follow-${person}`, kind: 'follow' };
  }
  // Independent watch positions around the camp, not a permanent orbit around the player.
  const angle = person * 2.4, radius = 7 + person % 4 * 2;
  return { x: home.x + Math.cos(angle) * radius, z: home.z + Math.sin(angle) * radius, key: `patrol-${person}`, kind: 'patrol' };
}