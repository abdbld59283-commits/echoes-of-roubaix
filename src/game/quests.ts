export type WorldKind = "backrooms" | "tundra" | "roubaix";

export interface Quest {
  id: number;
  title: string;
  brief: string;
  objective: string;
  world: WorldKind;
  special?: boolean;
  /** seconds, only for special quests */
  timeLimit?: number;
  monsters: number;
  monsterSpeed: number;
  lore: string;
}

/** 10 quêtes : des Backrooms jusqu'à Roubaix, -10 000 puis 2026. */
export const QUESTS: Quest[] = [
  {
    id: 1,
    title: "Le Niveau 0",
    brief:
      "Tu as traversé le mur. Moquette humide, lumière jaune, bourdonnement. Trouve la porte suintante avant que quelque chose ne te trouve.",
    objective: "Atteindre la porte suintante",
    world: "backrooms",
    monsters: 1,
    monsterSpeed: 2.6,
    lore: "La porte s'ouvre sur un couloir identique. Le bourdonnement a changé de note.",
  },
  {
    id: 2,
    title: "Les marques du mur",
    brief:
      "Quelqu'un a gravé une carte sur le papier peint. Rejoins la balise pour la relever — les Rôdeurs détestent la lumière qui bouge.",
    objective: "Relever la gravure lumineuse",
    world: "backrooms",
    monsters: 2,
    monsterSpeed: 2.0,
    lore: "La gravure dit : « LE CAMP EST AU SUD. NE COURS PAS EN LIGNE DROITE. »",
  },
  {
    id: 3,
    title: "Le camp de survivants",
    brief:
      "Des voix derrière les cloisons. Trouve le camp de survivants avant que les Rôdeurs ne le vident.",
    objective: "Trouver le camp de survivants",
    world: "backrooms",
    monsters: 3,
    monsterSpeed: 3.0,
    lore: "Trois survivants, une lampe torche, une rumeur : une faille mène à une plaine glacée.",
  },
  {
    id: 4,
    title: "QUÊTE SPÉCIALE — La faille de glace",
    brief:
      "La faille t'a aspirée hors des couloirs : te voilà à Roubaix, en -10 000. La meute t'a suivie. Atteins l'abri avant la fin du compte à rebours. Réussite : une vie supplémentaire.",
    objective: "Atteindre l'abri de glace (chrono)",
    world: "tundra",
    special: true,
    timeLimit: 70,
    monsters: 8,
    monsterSpeed: 3.5,
    lore: "Tu tombes. L'air devient tranchant. Tu respires du givre. Bienvenue à Roubaix, -10 000.",
  },
  {
    id: 5,
    title: "Toundra, -10 000",
    brief:
      "Weichsélien tardif. Là où sera Roubaix, il n'y a que steppe gelée, vent et os. Trouve un abri de roche.",
    objective: "Atteindre l'abri de roche",
    world: "tundra",
    monsters: 3,
    monsterSpeed: 3.0,
    lore: "Sous la roche, des cendres encore tièdes. Tu n'es pas seule ici.",
  },
  {
    id: 6,
    title: "Le feu",
    brief: "Sans feu, la nuit te tue. Récupère le silex et l'amadou dispersés par le blizzard.",
    objective: "Récupérer le foyer de silex",
    world: "tundra",
    monsters: 5,
    monsterSpeed: 3.1,
    lore: "Le feu prend. Les silhouettes reculent — mais elles tournent autour.",
  },
  {
    id: 7,
    title: "La piste des mammouths",
    brief:
      "Les chasseurs suivent le troupeau. Suis les traces jusqu'au point de passage de la Marque gelée.",
    objective: "Suivre les traces jusqu'au gué",
    world: "tundra",
    monsters: 5,
    monsterSpeed: 3.2,
    lore: "Le gué est gelé. De l'autre côté, des feux et des lances.",
  },
  {
    id: 8,
    title: "QUÊTE SPÉCIALE — Tempête de glace",
    brief:
      "Whiteout total. Rejoins la faille de glace avant le gel. Réussite : une vie supplémentaire.",
    objective: "Rejoindre l'abri avant le gel (chrono)",
    world: "tundra",
    special: true,
    timeLimit: 60,
    monsters: 8,
    monsterSpeed: 3.6,
    lore: "Tu survis. Le clan t'accepte. Ils parlent d'une pierre qui « avale le temps ».",
  },
  {
    id: 9,
    title: "QUÊTE SPÉCIALE — La pierre qui avale le temps",
    brief:
      "Le clan ouvre le passage vers 2026, mais il ne restera ouvert qu'un instant. Rejoins la pierre avant qu'il se referme. Les foyers de silex te protègent un moment. Réussite : une vie supplémentaire.",
    objective: "Atteindre la pierre du clan (chrono)",
    world: "tundra",
    special: true,
    timeLimit: 65,
    monsters: 8,
    monsterSpeed: 3.5,
    lore: "La pierre montre une ville : briques rouges, beffroi, pluie tiède. Roubaix.",
  },
  {
    id: 10,
    title: "Roubaix 2026",
    brief:
      "Dernier passage. Le soleil éclaire les façades de Roubaix. Aëla, Narek et Sila découvrent la ville avec toi. Rejoins la Grand-Place : les derniers Rôdeurs rôdent encore dans les rues.",
    objective: "Rejoindre la Grand-Place de Roubaix",
    world: "roubaix",
    monsters: 6,
    monsterSpeed: 3.6,
    lore: "La Grand-Place s'ouvre sous le soleil. Aëla, Narek et Sila lèvent les yeux vers l'hôtel de ville. Le passage s'est refermé. Vous êtes vivants. Roubaix, 2026.",
  },
];
