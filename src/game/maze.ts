export const CELL = 4;

export interface World {
  size: number;
  /** flat grid, 1 = solid */
  grid: Uint8Array;
  spawn: { x: number; z: number };
  goal: { x: number; z: number };
  monsterCells: { x: number; z: number }[];
  /** flint hearths / campfires (tundra only) */
  fireCells: { x: number; z: number }[];
  camp?: { x: number; z: number };
  enemyCamp?: { x: number; z: number };
  brigandCells?: { x: number; z: number }[];
  supplyCells?: { x: number; z: number }[];
  bossCell?: { x: number; z: number };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const at = (w: World, x: number, z: number) => w.grid[z * w.size + x] === 1;
const set = (grid: Uint8Array, size: number, x: number, z: number, v: number) => {
  grid[z * size + x] = v;
};
const get = (grid: Uint8Array, size: number, x: number, z: number) => grid[z * size + x] === 1;

export function cellToWorld(size: number, cx: number, cz: number) {
  const half = (size * CELL) / 2;
  return { x: cx * CELL - half + CELL / 2, z: cz * CELL - half + CELL / 2 };
}

export function worldToCell(size: number, x: number, z: number) {
  const half = (size * CELL) / 2;
  return { cx: Math.floor((x + half) / CELL), cz: Math.floor((z + half) / CELL) };
}

export function isSolid(world: World, x: number, z: number) {
  const { cx, cz } = worldToCell(world.size, x, z);
  if (cx < 0 || cz < 0 || cx >= world.size || cz >= world.size) return true;
  return at(world, cx, cz);
}

/** Recursive-backtracker maze, then punched open so it reads as rooms. */
export function generateMaze(size: number, seed: number, openness: number): World {
  const rnd = mulberry32(seed);
  const grid = new Uint8Array(size * size).fill(1);

  const stack: { x: number; z: number }[] = [{ x: 1, z: 1 }];
  set(grid, size, 1, 1, 0);
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    if (!cur) break;
    const dirs: { dx: number; dz: number }[] = [
      { dx: 2, dz: 0 },
      { dx: -2, dz: 0 },
      { dx: 0, dz: 2 },
      { dx: 0, dz: -2 },
    ].sort(() => rnd() - 0.5);
    let moved = false;
    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const nz = cur.z + d.dz;
      if (nx > 0 && nz > 0 && nx < size - 1 && nz < size - 1 && get(grid, size, nx, nz)) {
        set(grid, size, nx, nz, 0);
        set(grid, size, cur.x + d.dx / 2, cur.z + d.dz / 2, 0);
        stack.push({ x: nx, z: nz });
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }

  for (let z = 1; z < size - 1; z++)
    for (let x = 1; x < size - 1; x++)
      if (get(grid, size, x, z) && rnd() < openness) set(grid, size, x, z, 0);

  const world: World = {
    size,
    grid,
    spawn: { x: 1, z: 1 },
    goal: { x: 1, z: 1 },
    monsterCells: [],
    fireCells: [],
  };

  world.goal = pickGoal(grid, size, world.spawn, rnd);
  return world;
}

/** Random open cell among the farthest from the spawn — the goal moves every run. */
function pickGoal(grid: Uint8Array, size: number, spawn: { x: number; z: number }, rnd: () => number) {
  let max = 0;
  const open: { x: number; z: number; d: number }[] = [];
  for (let z = 1; z < size - 1; z++) {
    for (let x = 1; x < size - 1; x++) {
      if (get(grid, size, x, z)) continue;
      const d = Math.abs(x - spawn.x) + Math.abs(z - spawn.z);
      open.push({ x, z, d });
      if (d > max) max = d;
    }
  }
  const far = open.filter((o) => o.d >= max * 0.65);
  return far[Math.floor(rnd() * far.length)] ?? { ...spawn };
}

/** Open snow plain with scattered ice blocks. */
export function generateTundra(size: number, seed: number): World {
  const rnd = mulberry32(seed);
  const grid = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const border = x === 0 || z === 0 || x === size - 1 || z === size - 1;
      set(grid, size, x, z, border || (x > 1 && z > 1 && rnd() < 0.14) ? 1 : 0);
    }
  }
  set(grid, size, 1, 1, 0);
  set(grid, size, 2, 1, 0);
  set(grid, size, 1, 2, 0);

  const camp = { x: 4, z: 4 };
  for (let z = 1; z <= 7; z++) for (let x = 1; x <= 7; x++) set(grid, size, x, z, 0);
  // A random reachable destination, within the unchanged special quest timers.
  const candidates: { x: number; z: number }[] = [];
  for (let z = 10; z < Math.min(size - 1, 22); z++) for (let x = 10; x < Math.min(size - 1, 22); x++)
    if (!get(grid, size, x, z) && Math.hypot(x - 1, z - 1) < 25) candidates.push({ x, z });
  const goal = candidates[Math.floor(rnd() * candidates.length)] ?? { x: 15, z: 15 };
  // Carve a guaranteed corridor between the camp and the destination.
  for (let x = 1; x <= goal.x; x++) set(grid, size, x, 4, 0);
  for (let z = 4; z <= goal.z; z++) set(grid, size, goal.x, z, 0);
  set(grid, size, goal.x, goal.z, 0);
  set(grid, size, goal.x - 1, goal.z, 0);
  set(grid, size, goal.x, goal.z - 1, 0);

  const fireCells: { x: number; z: number }[] = [{ ...camp }];
  let tries = 0;
  while (fireCells.length < 5 && tries++ < 400) {
    const x = 2 + Math.floor(rnd() * (size - 4));
    const z = 2 + Math.floor(rnd() * (size - 4));
    if (get(grid, size, x, z)) continue;
    if (Math.abs(x - 1) + Math.abs(z - 1) < 5) continue;
    if (fireCells.some((f) => Math.abs(f.x - x) + Math.abs(f.z - z) < 5)) continue;
    fireCells.push({ x, z });
  }
  const enemyCamp = { x: goal.x + 5, z: goal.z };
  for (let z = enemyCamp.z - 3; z <= enemyCamp.z + 3; z++)
    for (let x = goal.x; x <= enemyCamp.x + 3; x++) set(grid, size, x, z, 0);
  const brigandCells = Array.from({ length: 10 }, (_, i) => ({ x: enemyCamp.x - 2 + i % 5, z: enemyCamp.z - 2 + Math.floor(i / 5) * 4 }));
  const provisional: World = { size, grid, spawn: { x: 4, z: 2 }, goal, monsterCells: [], fireCells, camp };
  const path = routeToGoal(provisional);
  const supplyCells = [provisional.spawn, ...path.filter((_, i) => i > 0 && i % 5 === 0)];
  return { ...provisional, enemyCamp, brigandCells, supplyCells, bossCell: { x: goal.x + 2, z: goal.z } };
}

export function pickMonsterCells(world: World, count: number, seed: number) {
  const rnd = mulberry32(seed * 7919 + 13);
  const open: { x: number; z: number }[] = [];
  for (let z = 1; z < world.size - 1; z++)
    for (let x = 1; x < world.size - 1; x++)
      if (!at(world, x, z) && Math.abs(x - world.spawn.x) + Math.abs(z - world.spawn.z) > 8)
        open.push({ x, z });

  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < count && open.length > 0; i++) {
    const idx = Math.floor(rnd() * open.length);
    const picked = open.splice(idx, 1)[0];
    if (picked) out.push(picked);
  }
  return out;
}

/** Roubaix 2026: sunny streets around the Grand-Place. */
export function generateRoubaix(size: number, seed: number): World {
  const rnd = mulberry32(seed);
  const grid = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const border = x === 0 || z === 0 || x === size - 1 || z === size - 1;
      // Streets every 4 cells; blocks in between are brick buildings (with a few alleys).
      const block = x % 4 !== 0 && z % 4 !== 0;
      set(grid, size, x, z, border || (block && rnd() < 0.88) ? 1 : 0);
    }
  }
  const mid = Math.floor(size / 2);
  const spawn = { x: mid, z: size - 4 };
  const goal = { x: mid, z: mid };
  // Broad avenue into a fully walkable Grand-Place.
  for (let z = mid - 4; z < size - 1; z++) for (let x = mid - 1; x <= mid + 1; x++) set(grid, size, x, z, 0);
  for (let z = mid - 4; z <= mid + 4; z++) for (let x = mid - 5; x <= mid + 5; x++) set(grid, size, x, z, 0);

  return { size, grid, spawn, goal, monsterCells: [], fireCells: [] };
}

export function buildWorld(kind: "backrooms" | "tundra" | "roubaix", seed: number, monsters: number, guided = false): World {
  const world =
    kind === "backrooms"
      ? generateMaze(21, seed, 0.22)
      : kind === "tundra"
        ? generateTundra(165, seed)
        : generateRoubaix(25, seed);
  if (kind === "backrooms" && guided) {
    const path = routeToGoal(world);
    const nearer = path[Math.min(path.length - 1, 10 + Math.abs(seed % 5))];
    if (nearer) world.goal = { ...nearer };
  }
  world.monsterCells = pickMonsterCells(world, monsters, seed);
  return world;
}

/** Yaw (camera at yaw 0 looks toward -Z) pointing at an open neighbour cell. */
export function spawnYaw(world: World) {
  const { x, z } = world.spawn;
  if (!at(world, x + 1, z)) return -Math.PI / 2; // +X
  if (!at(world, x, z + 1)) return Math.PI; // +Z
  if (!at(world, x - 1, z)) return Math.PI / 2; // -X
  return 0; // -Z
}

/** Breadth-first route through open cells, also used by the level-two guide. */
export function routeToGoal(world: World, start = world.spawn, goal = world.goal) {
  const queue = [start];
  const parent = new Map<number, number>();
  const key = (p: { x: number; z: number }) => p.z * world.size + p.x;
  const first = key(start); parent.set(first, first);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (!p) continue;
    const current = key(p);
    if (current === key(goal)) {
      const path: { x: number; z: number }[] = [];
      let k = current;
      while (k !== first) {
        path.push({ x: k % world.size, z: Math.floor(k / world.size) });
        const prev = parent.get(k); if (prev === undefined) return [];
        k = prev;
      }
      return [start, ...path.reverse()];
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: p.x + dx, z: p.z + dz };
      if (next.x < 0 || next.z < 0 || next.x >= world.size || next.z >= world.size || at(world, next.x, next.z) || parent.has(key(next))) continue;
      parent.set(key(next), current); queue.push(next);
    }
  }
  return [];
}
