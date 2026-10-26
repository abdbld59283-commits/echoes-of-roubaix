import { describe, expect, it } from 'vitest';
import { companionJob, type TeamJob, type JobCandidate } from './assistance';

const origin = { x: 0, z: 0 }, distantPlayer = { x: 200, z: 200 };
const collect: JobCandidate = { key: 'flint', kind: 'collect', x: 12, z: 0 };
const brigand: JobCandidate = { key: 'brigand', kind: 'combat', brigand: true, x: 18, z: 0 };
describe('autonomous companions', () => {
  it('collects quest objects without following a distant player', () => {
    expect(companionJob(0, true, 'autonomous', origin, distantPlayer, origin, [collect], new Map())).toEqual(collect);
  });
  it('armed fighters engage brigands before regrouping', () => {
    expect(companionJob(1, true, 'autonomous', origin, distantPlayer, origin, [collect, brigand], new Map()).key).toBe('brigand');
  });
  it('does not assign the same quest object to several companions', () => {
    const jobs = new Map<number, TeamJob>([[0, collect]]);
    expect(companionJob(3, true, 'autonomous', origin, distantPlayer, origin, [collect], jobs).kind).toBe('patrol');
  });
  it('unarmed companions get a weapon instead of attacking', () => {
    const weapon: JobCandidate = { key: 'weapon', kind: 'arm', x: 20, z: 0 };
    expect(companionJob(1, false, 'autonomous', origin, distantPlayer, origin, [brigand, weapon], new Map()).kind).toBe('arm');
  });
  it('idle autonomous companions guard the camp instead of chasing the player', () => {
    const job = companionJob(2, true, 'autonomous', origin, distantPlayer, origin, [], new Map());
    expect(job.kind).toBe('patrol');
    expect(Math.hypot(job.x, job.z)).toBeLessThan(15);
  });
  it('hold order stops independent movement', () => {
    expect(companionJob(1, true, 'hold', origin, distantPlayer, origin, [brigand, collect], new Map())).toEqual({ ...origin, key: 'hold-1', kind: 'hold' });
  });
});