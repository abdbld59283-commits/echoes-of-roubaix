import { useEffect, useState } from "react";
const names = ["sky", "stone", "water", "leaf", "sun", "metal", "signal", "roof"] as const;
type Palette = Record<typeof names[number], string>;
export function useScenePalette() {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setPalette(Object.fromEntries(names.map(name => [name, style.getPropertyValue(`--scene-${name}`).trim()])) as Palette);
  }, []);
  return palette;
}