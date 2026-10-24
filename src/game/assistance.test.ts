import { describe, expect, it } from 'vitest';
import { nearbyResource, questAssistance, openingPhase, guidanceRoute } from './assistance';
import { buildWorld, cellToWorld } from './maze';
import { silexCells } from './expedition';

describe('requested quest and companion rules', () => {
  it('quest 2 has no objective or flint assistance', () => {
    expect(questAssistance({ id: 2, world: 'backrooms' })).toEqual({ objective: false, flint: false });
  });
  it('flint assistance belongs to the tundra', () => {
    expect(questAssistance({ id: 6, world: 'tundra' }).flint).toBe(true);
    expect(questAssistance({ id: 1, world: 'backrooms' }).flint).toBe(false);
  });
  it('companions collect nearby resources, not remote quest objects', () => {
    const nearby = { x: 4, z: 0 }, remote = { x: 100, z: 0 };
    expect(nearbyResource([remote, nearby], { x: 0, z: 0 }, { x: 95, z: 0 })).toEqual(nearby);
    expect(nearbyResource([remote], { x: 0, z: 0 }, { x: 95, z: 0 })).toBeUndefined();
  });
  it('collected resources are no longer available to the companions', () => {
    const items = new Map([['flint', { x: 2, z: 0 }]]);
    expect(nearbyResource(items.values(), { x: 0, z: 0 }, { x: 0, z: 0 })).toBeDefined();
    items.delete('flint');
    expect(nearbyResource(items.values(), { x: 0, z: 0 }, { x: 0, z: 0 })).toBeUndefined();
  });
  it('guidance follows walkable maze cells to the flint', () => {
    const world = buildWorld('tundra', 6007, 5);
    const target = silexCells(world)[0];
    expect(target).toBeDefined();
    if (!target) return;
    const route = guidanceRoute(world, cellToWorld(world.size, world.spawn.x, world.spawn.z), cellToWorld(world.size, target.x, target.z));
    expect(route.length).toBeGreaterThan(1);
    expect(route.at(-1)).toEqual(target);
    for (const cell of route) expect(world.grid[cell.z * world.size + cell.x]).toBe(0);
  });
  it('new games start with the Backrooms cinematic', () => {
    expect(openingPhase(0, 'backrooms')).toBe('intro');
    expect(openingPhase(1, 'backrooms')).toBe('play');
  });
  it('entering Roubaix runs the arrival before gameplay', () => {
    expect(openingPhase(9, 'roubaix')).toBe('arrival');
  });
});