import { describe, expect, it } from "vitest";
import { parseCheckpoint } from "./save";

describe("checkpoints", () => {
  it("resumes at the saved quest with the saved lives", () => {
    expect(parseCheckpoint('{"index":4,"lives":2,"clues":["a"]}', 10)).toEqual({ index: 4, lives: 2, clues: ["a"] });
  });
  it("ignores saves without lives or beyond the last quest", () => {
    expect(parseCheckpoint('{"index":4,"lives":0}', 10)).toBeNull();
    expect(parseCheckpoint('{"index":10,"lives":3}', 10)).toBeNull();
    expect(parseCheckpoint("not json", 10)).toBeNull();
  });
});
