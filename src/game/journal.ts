import { at, cellToWorld, type World } from './maze';

export interface WallClue { id: string; text: string; position: [number, number, number]; rotation: number }
const NOTES = [
  'Le bourdonnement ne s’arrête jamais. Quelqu’un est passé avant nous.',
  'Les murs gardent les traces de ceux qui ne sont pas revenus.',
  'Nous avons entendu des voix. Nous ne sommes pas seuls.',
];

/** Narrative traces only: quest two deliberately contains no visual assistance. */
export function wallClues(world: World, questIndex: number): WallClue[] {
  if (questIndex === 1 || questIndex > 2) return [];
  const clues: WallClue[] = [];
  for (let z = 1; z < world.size - 1; z++) for (let x = 1; x < world.size - 1; x++) {
    if (at(world, x, z) || (Math.abs(x - world.spawn.x) + Math.abs(z - world.spawn.z)) % 9 !== 0) continue;
    const p = cellToWorld(world.size, x, z);
    const side = at(world, x, z - 1) ? 0 : at(world, x + 1, z) ? 1 : -1;
    if (side < 0) continue;
    const text = NOTES[clues.length % NOTES.length];
    if (!text) continue;
    clues.push({ id: `wall-${questIndex}-${clues.length}`, text, position: side === 0 ? [p.x, 1.7, p.z - 1.98] : [p.x + 1.98, 1.7, p.z], rotation: side === 0 ? 0 : -Math.PI / 2 });
    if (clues.length === 3) return clues;
  }
  return clues;
}

export function addClue(clues: string[], text: string): string[] {
  return clues.includes(text) ? clues : [...clues, text];
}