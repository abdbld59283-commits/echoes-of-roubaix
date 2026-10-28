import { describe, expect, it } from 'vitest';
import { buildWorld, isSolid } from './maze';
import { addClue, wallClues } from './journal';

describe('investigation journal', () => {
  it('never adds wall assistance to quest two', () => {
    expect(wallClues(buildWorld('backrooms', 2007, 2, true), 1)).toEqual([]);
  });
  it('records each discovered note once', () => {
    expect(addClue(['trace'], 'trace')).toEqual(['trace']);
    expect(addClue(['trace'], 'new')).toEqual(['trace', 'new']);
  });
  it('places readable traces on the walkable side of walls', () => {
    const world = buildWorld('backrooms', 1007, 1);
    const clues = wallClues(world, 0);
    expect(clues.length).toBeGreaterThan(0);
    for (const clue of clues) expect(isSolid(world, clue.position[0], clue.position[2])).toBe(false);
  });
});