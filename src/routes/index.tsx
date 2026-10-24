import { createFileRoute } from "@tanstack/react-router";

import { BackroomsGame } from "@/components/game/BackroomsGame";

const title = "Roubaix Echoes — des Backrooms à la Grand-Place";
const description =
  "Une aventure immersive en dix quêtes et trois mondes : survis aux Backrooms, protège les survivants de la toundra et retrouve la Grand-Place de Roubaix en 2026.";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackroomsGame,
});
