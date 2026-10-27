export const SAVE_KEY = "roubaix-echoes-save";
export interface Checkpoint { index: number; lives: number; clues: string[] }

/** Validates a stored checkpoint; anything malformed is ignored rather than crashing the title screen. */
export function parseCheckpoint(raw: string | null, questCount: number): Checkpoint | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Checkpoint>;
    if (typeof v.index !== "number" || typeof v.lives !== "number") return null;
    if (v.index < 0 || v.index >= questCount || v.lives < 1) return null;
    return { index: Math.floor(v.index), lives: Math.floor(v.lives), clues: Array.isArray(v.clues) ? v.clues.filter((c): c is string => typeof c === "string") : [] };
  } catch {
    return null;
  }
}

export function saveCheckpoint(c: Checkpoint) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(c)); } catch { /* storage unavailable */ }
}
export function loadCheckpoint(questCount: number) {
  try { return parseCheckpoint(localStorage.getItem(SAVE_KEY), questCount); } catch { return null; }
}
export function clearCheckpoint() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
