import { describe, it as test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { QUESTS } from "./quests";
import { closestThreat, monsterThreat } from "./threat";

describe("requested monster rules", () => {
  test("tundra populations increase by 50%, rounded up", () => {
    deepStrictEqual(QUESTS.filter((quest) => quest.world === "tundra").map((quest) => quest.monsters), [8, 3, 5, 5, 8, 8]);
  });
  test("Backrooms populations are unchanged", () => {
    deepStrictEqual(QUESTS.filter((quest) => quest.world === "backrooms").map((quest) => quest.monsters), [1, 2, 3]);
  });
  test("the final quest happens in Roubaix 2026 with 6 monsters", () => {
    const last = QUESTS[QUESTS.length - 1]!;
    strictEqual(last.world, "roubaix");
    strictEqual(last.monsters, 6);
  });
  test("only a pursuing monster triggers the oval", () => {
    strictEqual(monsterThreat(14, false).chasing, true);
    strictEqual(monsterThreat(15, false).chasing, false);
  });
  test("a monster fleeing a fire triggers neither chase nor proximity warning", () => {
    deepStrictEqual(monsterThreat(2, true), { distance: Infinity, chasing: false });
  });
  test("a second monster keeps the chase warning active", () => {
    deepStrictEqual(closestThreat([monsterThreat(2, true), monsterThreat(10, false)]), { distance: 10, chasing: true });
    deepStrictEqual(closestThreat([]), { distance: Infinity, chasing: false });
  });
});