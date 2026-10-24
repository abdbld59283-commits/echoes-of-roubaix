import type { Quest } from "@/game/quests";
import type { Ammo } from "./Weapon";
import { StoryProgress } from "./GameExperience";

export function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: Math.max(lives, 0) }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-3.5 w-3.5 rotate-45 rounded-[2px] bg-blood shadow-[0_0_10px_var(--blood)]"
        />
      ))}
      {lives <= 0 && <span className="text-xs text-blood">aucune vie</span>}
    </div>
  );
}

export function HUD({
  quest,
  index,
  lives,
  distance,
  timeLeft,
  ammo,
  mission,
  kills,
  reinforced = false,
}: {
  quest: Quest;
  index: number;
  lives: number;
  distance: number;
  timeLeft: number | null;
  ammo: Ammo;
  mission: string | null;
  kills: number;
  reinforced?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-mono">
      <div className="game-hud-top">
        <div className="min-w-0 border-l-2 border-mustard bg-game-dark/70 px-3 py-2 backdrop-blur-sm">
          <StoryProgress index={index} />
          <p className="mt-3 text-[10px] uppercase text-hud/70">
            Quête {index + 1} / 10
          </p>
          <p className="mt-1 text-xs sm:text-sm text-hud">{quest.objective}</p>
          <p className="mt-2 text-[11px] text-hud/60">Distance : {distance.toFixed(0)} m</p>
          {mission && <p className="mt-2 text-xs text-mustard">{mission}</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <Hearts lives={lives} />
          {timeLeft !== null && (
            <p
              className={`text-2xl tabular-nums ${timeLeft <= 10 ? "animate-danger text-blood" : "text-hud"}`}
            >
              {Math.max(0, Math.ceil(timeLeft))}s
            </p>
          )}
        </div>
      </div>

       <div className="ammo-hud text-right text-hud" aria-label="Munitions"><p className="text-2xl tabular-nums">{ammo.reloading ? "…" : ammo.rounds} <span className="text-sm text-hud/50">/ {ammo.reserve}</span></p><p className="text-[10px] text-hud/60">{reinforced ? "PISTOLET RENFORCÉ" : "PISTOLET"} · {kills} RÔDEURS ÉLIMINÉS</p></div>

      <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud/70" />
    </div>
  );
}
