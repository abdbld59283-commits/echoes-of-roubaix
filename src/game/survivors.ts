export const SURVIVORS = [
  { name: "Aëla", role: "Gardienne du feu", mission: "Les braises du clan", request: "Le blizzard a dispersé nos silex. Ramène les deux fragments lumineux. Sans eux, le feu ne tiendra pas.", thanks: "Le feu vivra encore. Prends ces munitions : tu nous as sauvés.", kind: "collect" },
  { name: "Narek", role: "Chasseur", mission: "Tenir le camp", request: "Les Rôdeurs encerclent le camp. Élimine deux d'entre eux avec ton arme, puis reviens me voir.", thanks: "La meute recule ! Nous pouvons enfin traverser la plaine.", kind: "hunt" },
  { name: "Sila", role: "Gardienne du passage", mission: "Les éclats du temps", request: "Deux éclats de la pierre sont perdus dans la neige. Rapporte-les : ensemble, nous ouvrirons le passage vers ta ville.", thanks: "La pierre s'éveille. Nous te suivrons de l'autre côté.", kind: "collect" },
] as const;

export function survivorForQuest(index: number) { return SURVIVORS[(index - 3 + 3) % 3] ?? SURVIVORS[0]; }
export function missionComplete(kind: string, collected: number, kills: number) { return kind === "hunt" ? kills >= 2 : collected >= 2; }