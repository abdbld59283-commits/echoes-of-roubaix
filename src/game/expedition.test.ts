import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { buildWorld, routeToGoal } from "./maze";
import { TEAM_SIZE, BRIGAND_COUNT, bossPower, supplyReward } from "./expedition";

describe("new tundra expedition", () => {
  it("the tundra dimensions are five times the previous 33-cell map", () => {
    strictEqual(buildWorld("tundra", 7, 8).size, 33 * 5);
  });
  it("the team contains 19 survivors", () => { strictEqual(TEAM_SIZE, 19); });
  it("the enemy camp contains exactly 10 reachable brigands", () => {
    strictEqual(BRIGAND_COUNT, 10);
    const world = buildWorld("tundra", 7, 8);
    strictEqual(world.brigandCells?.length, 10);
    for (const cell of world.brigandCells ?? []) ok(routeToGoal(world, world.spawn, cell).length > 0);
  });
  it("the boss becomes stronger at every 60-second boundary", () => {
    strictEqual(bossPower(59.99).level, 1);
    strictEqual(bossPower(60).level, 2);
    strictEqual(bossPower(120).level, 3);
    ok(bossPower(60).maxHp > bossPower(0).maxHp);
    ok(bossPower(120).speed > bossPower(60).speed);
    ok(bossPower(0).maxHp > 8);
  });
  it("ground weapons include ammunition and a reinforced variant", () => {
    strictEqual(supplyReward(0).rounds, 32);
    strictEqual(supplyReward(2).reinforced, true);
    strictEqual(supplyReward(2).rounds, 48);
    for (let seed = 0; seed < 10; seed++) {
      const world = buildWorld("tundra", seed, 8);
      ok((world.supplyCells?.length ?? 0) > 2);
      for (const cell of world.supplyCells ?? []) ok(routeToGoal(world, world.spawn, cell).length > 0);
    }
  });
});
import { silexCells, canLeaveTundra, applyBrigandHit, PLAYER_HIT_POINTS } from "./expedition";
describe("silex and brigand rules", () => {
  it("two reachable flint fragments are placed in the tundra", () => {
    const world = buildWorld("tundra", 11, 8);
    const cells = silexCells(world);
    strictEqual(cells.length, 2);
    for (const c of cells) ok(routeToGoal(world, world.spawn, c).length > 0);
  });
  it("the tundra exit stays closed until both fragments are found", () => {
    strictEqual(canLeaveTundra(1), false);
    strictEqual(canLeaveTundra(2), true);
  });
  it("brigands cost a life after four hits", () => {
    let hp = PLAYER_HIT_POINTS, lost = 0;
    for (let i = 0; i < 4; i++) { const r = applyBrigandHit(hp); hp = r.hp; if (r.lifeLost) lost++; }
    strictEqual(lost, 1); strictEqual(hp, 4);
  });
});
