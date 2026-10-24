import { ArrowRight, Volume2, VolumeX, Radio, Check, RotateCcw } from "lucide-react";
import { EchoBackdrop, EchoLoader, EchoFeedback, StoryProgress, MobileControls, ShareJourney } from "./GameExperience";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Backrooms } from "./Backrooms";
import { HUD, Hearts } from "./HUD";
import { Monster } from "./Monster";
import { Objective } from "./Objective";
import { Player } from "./Player";
import { Tracker } from "./Tracker";
import { ThreatMonitor } from "./ThreatMonitor";
import { Campfires, type FireState } from "./Campfires";
import { Roubaix } from "./Roubaix";
import { Tundra } from "./Tundra";
import { chime, playCatchSound, scream, startDrone, stopDrone, setAudioMuted, interactionSound } from "@/game/audio";
import type { AttackView, Threat } from "@/game/threat";
import { useKeyboard, usePointerLook } from "@/game/input";
import { buildWorld, cellToWorld, spawnYaw } from "@/game/maze";
import { QUESTS } from "@/game/quests";
import { Button as ControlButton } from "@/components/ui/button";
import { Weapon, type Ammo } from "./Weapon";
import { Arrival } from "./Arrival";
import { PathGuide } from "./PathGuide";
import { MissionPickup, SurvivorCamp } from "./SurvivorCamp";
import { SURVIVORS, missionComplete } from "@/game/survivors";
import type { Target } from "@/game/combat";
import { EnemyCamp, GroundSupply, SurvivorTeam } from "./Expedition";
import { supplyReward, silexCells, canLeaveTundra, applyBrigandHit, PLAYER_HIT_POINTS, SILEX_REQUIRED, TEAM_SIZE } from "@/game/expedition";
import { Finale } from "./Finale";

type Phase = "title" | "brief" | "play" | "arrival" | "finale" | "cleared" | "gameover" | "victory";

const MAX_LIVES = 5;

export function BackroomsGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [muted, setMuted] = useState(false);
  const [pickupEcho, setPickupEcho] = useState(0);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [attempt, setAttempt] = useState(0);
  const [distance, setDistance] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [bonus, setBonus] = useState(false);
  const [chasing, setChasing] = useState(false);
  const [attacked, setAttacked] = useState(false);
  const targets = useRef(new Map<string, Target>());
  const ammo = useRef<Ammo>({ rounds: 8, reserve: 32, reloading: false });
  const [ammoView, setAmmoView] = useState<Ammo>(ammo.current);
  const [kills, setKills] = useState(0);
  const [nearPerson, setNearPerson] = useState<number | null>(null);
  const [dialogue, setDialogue] = useState<number | null>(null);
  const [mission, setMission] = useState<number | null>(null);
  const [collected, setCollected] = useState(0);
  const [rewarded, setRewarded] = useState(false);
  const [following, setFollowing] = useState(true);
  const [reinforced, setReinforced] = useState(false);
  const [brigandsKilled, setBrigandsKilled] = useState(0);
  const [boss, setBoss] = useState({ hp: 32, maxHp: 32, level: 1, next: 60 });
  const [loot, setLoot] = useState<string | null>(null);
  const allies = useRef(new Map<number, THREE.Vector3>());
  const allyHits = useRef(new Map<number, () => void>());
  const supplies = useRef(new Map<number, { x: number; z: number }>());
  const [team, setTeam] = useState(TEAM_SIZE);
  const onAllyDown = useCallback(() => setTeam(t => Math.max(0, t - 1)), []);
  const [silex, setSilex] = useState(0);
  const onSilex = useCallback(() => { setSilex(c => c + 1); setPickupEcho(c => c + 1); chime(false); }, []);
  const [hp, setHp] = useState(PLAYER_HIT_POINTS);
  const hpRef = useRef(PLAYER_HIT_POINTS);
  const [blocked, setBlocked] = useState(false);
  const onBrigandKill = useCallback(() => setBrigandsKilled(k => k + 1), []);
  const onSupply = useCallback((i: number) => {
    const reward = supplyReward(i);
    ammo.current.reserve += reward.rounds; setAmmoView({ ...ammo.current });
    if (reward.reinforced) setReinforced(true);
    setPickupEcho(c => c + 1);
    setLoot(`${reward.reinforced ? "Pistolet renforcé" : "Munitions récupérées"} · +${reward.rounds}`); chime(false);
  }, []);
  useEffect(() => { if (!loot) return; const id = window.setTimeout(() => setLoot(null), 3000); return () => window.clearTimeout(id); }, [loot]);
  const onKill = useCallback(() => setKills(k => k + 1), []);
  const onCollect = useCallback(() => { setCollected(c => c + 1); setPickupEcho(c => c + 1); chime(false); }, []);

  const quest = QUESTS[index] ?? QUESTS[0];
  if (!quest) throw new Error("Aucune quête disponible");
  const playing = phase === "play";

  const keys = useKeyboard();
  const { look } = usePointerLook(containerRef, playing && dialogue === null);
  const shake = useRef(0);
  const invUntil = useRef(0);
  const playerPos = useMemo(() => new THREE.Vector3(), []);
  const fires = useRef<FireState[]>([]);
  const threats = useRef(new Map<string, Threat>());
  const attack = useRef<AttackView | null>(null);
  const deathTimer = useRef<number | undefined>(undefined);
  const livesRef = useRef(lives);
  const loseLifeRef = useRef<(restart?: boolean) => void>(() => {});
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => () => {
    window.clearTimeout(deathTimer.current);
    stopDrone();
    window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => {
    threats.current.clear();
    setChasing(false);
  }, [phase, attempt, index]);

  const world = useMemo(
    () => buildWorld(quest.world, (index + 1) * 1000 + attempt * 37 + 7, quest.monsters, index === 1),
    [quest, index, attempt],
  );

  const spawn = useMemo(() => cellToWorld(world.size, world.spawn.x, world.spawn.z), [world]);
  const goalPos = useMemo(() => {
    const g = cellToWorld(world.size, world.goal.x, world.goal.z);
    return [g.x, 1, g.z] as [number, number, number];
  }, [world]);
  const pickupPositions = useMemo(() => {
    const center = world.camp ? cellToWorld(world.size, world.camp.x, world.camp.z) : spawn;
    return [[center.x - 8, 0.6, center.z - 8], [center.x + 8, 0.6, center.z + 8]] as [number, number, number][];
  }, [world, spawn]);
  const silexPositions = useMemo(() => quest.world !== "tundra" ? [] : silexCells(world).map(c => { const w = cellToWorld(world.size, c.x, c.z); return [w.x, 0.6, w.z] as [number, number, number]; }), [world, quest.world]);
  useEffect(() => { if (!blocked) return; const id = window.setTimeout(() => setBlocked(false), 2500); return () => window.clearTimeout(id); }, [blocked]);
  const talk = useCallback(() => { if (nearPerson !== null && !attack.current) { document.exitPointerLock?.(); setDialogue(nearPerson); } }, [nearPerson]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === "KeyE" && !e.repeat && playing) talk(); };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [playing, talk]);
  const finishArrival = useCallback(() => setPhase("play"), []);

  // Place the player at the spawn whenever a run (re)starts.
  useEffect(() => {
    playerPos.set(spawn.x, 0, spawn.z);
    look.current.yaw = quest.world === "roubaix" ? 0 : spawnYaw(world);
    look.current.pitch = 0;
    invUntil.current = performance.now() + 1500;
  }, [spawn, playerPos, look, phase, world, quest.world]);

  // Ambience per world.
  useEffect(() => {
    if (!playing) {
      stopDrone();
      return;
    }
    startDrone(quest.world);
    return () => stopDrone();
  }, [playing, quest.world]);

  // Countdown for special quests.
  useEffect(() => {
    if (!playing || !quest.special || !quest.timeLimit) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(quest.timeLimit);
    const limit = quest.timeLimit;
    const started = performance.now();
    const id = window.setInterval(() => {
      const left = limit - (performance.now() - started) / 1000;
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        loseLifeRef.current(true);
      }
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, quest, attempt]);

  const loseLife = useCallback(
    (restart = false) => {
      if (attack.current || performance.now() < invUntil.current) return;
      invUntil.current = performance.now() + 2200;
      scream();
      shake.current = 1.4;
      setFlash(true);
      window.setTimeout(() => setFlash(false), 450);

      const next = Math.max(0, livesRef.current - 1);
      livesRef.current = next;
      setLives(next);
      if (next <= 0) {
        document.exitPointerLock?.();
        setPhase("gameover");
      } else if (restart) {
        setAttempt((a) => a + 1);
      } else {
        playerPos.set(spawn.x, 0, spawn.z);
      }
    },
    [playerPos, spawn],
  );
  useEffect(() => { loseLifeRef.current = loseLife; }, [loseLife]);

  const onMonsterCatch = useCallback((position: THREE.Vector3) => {
    const now = performance.now();
    if (attack.current || now < invUntil.current) return false;
    attack.current = { x: position.x, z: position.z, until: now + 1900 };
    setAttacked(true);
    setChasing(false);
    playCatchSound();
    deathTimer.current = window.setTimeout(() => {
      attack.current = null;
      setAttacked(false);
      loseLifeRef.current(false);
      look.current.yaw = quest.world === "roubaix" ? 0 : spawnYaw(world);
      look.current.pitch = 0;
    }, 1900);
    return true;
  }, [look, world, quest.world]);

  const onShootPlayer = useCallback(() => {
    if (attack.current || performance.now() < invUntil.current) return;
    const r = applyBrigandHit(hpRef.current);
    hpRef.current = r.hp; setHp(r.hp);
    shake.current = 0.5; setFlash(true); window.setTimeout(() => setFlash(false), 200);
    if (r.lifeLost) loseLifeRef.current(false);
  }, []);

  const onReach = useCallback(() => {
    if (attack.current) return false;
    if (quest.world === "tundra" && !canLeaveTundra(silex)) { setBlocked(true); return false; }
    chime(true);
    document.exitPointerLock?.();
    if (quest.special) {
      setBonus(lives < MAX_LIVES);
      setLives((l) => Math.min(MAX_LIVES, l + 1));
    } else {
      setBonus(false);
    }
    setPhase(index === QUESTS.length - 1 ? "finale" : "cleared");
    return true;
  }, [quest.special, quest.world, index, lives, silex]);

  const startQuest = () => {
    targets.current.clear();
    ammo.current = { rounds: 8, reserve: 32, reloading: false }; setAmmoView({ ...ammo.current });
    setKills(0); setMission(null); setCollected(0); setRewarded(false); setDialogue(null); setNearPerson(null);
    setBrigandsKilled(0); setBoss({ hp: 32, maxHp: 32, level: 1, next: 60 }); setReinforced(false); setFollowing(true); setLoot(null);
    setSilex(0); setTeam(TEAM_SIZE); hpRef.current = PLAYER_HIT_POINTS; setHp(PLAYER_HIT_POINTS);
    setAttempt((a) => a + 1);
    setPhase(quest.world === "roubaix" ? "arrival" : "play");
  };

  const restartGame = () => {
    setIndex(0);
    setLives(3);
    setAttempt((a) => a + 1);
    setPhase("brief");
  };

  return (
    <div ref={containerRef} data-phase={phase} className="game-shell fixed inset-0 cursor-crosshair bg-game-dark" onClickCapture={() => interactionSound()}>
      {(phase === "title" || phase === "brief") && <EchoBackdrop />}
      <ControlButton variant="ghost" size="icon" className="audio-toggle" aria-label={muted ? "Activer le son" : "Couper le son"} title={muted ? "Activer le son" : "Couper le son"} aria-pressed={muted} onClick={() => { setAudioMuted(!muted); setMuted(v => !v); }}>{muted ? <VolumeX /> : <Volume2 />}</ControlButton>
      {phase !== "title" && (
        <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 76, near: 0.1, far: 120 }}>
          <Suspense fallback={null}>
            {quest.world === "backrooms" ? (
              <Backrooms world={world} playerPos={playerPos} />
            ) : quest.world === "tundra" ? (
              <Tundra world={world} playerPos={playerPos} storm={quest.special || index >= 7} />
            ) : (
              <Roubaix world={world} playerPos={playerPos} clear={phase === "finale" || phase === "victory"} />
            )}

            {quest.world === "tundra" && <Campfires world={world} playerPos={playerPos} fires={fires} />}
            {quest.world === "tundra" && <SurvivorCamp world={world} playerPos={playerPos} active={false} onNear={setNearPerson} hidePeople />}
            {quest.world === "tundra" && <SurvivorTeam key={`team-${index}-${attempt}`} world={world} playerPos={playerPos} active={playing && dialogue === null} following={following} targets={targets} attack={attack} allies={allies} allyHits={allyHits} supplies={supplies} onDown={onAllyDown} onNear={setNearPerson} missionPoints={mission !== null && SURVIVORS[mission]?.kind === "collect" && collected < 2 ? pickupPositions : []} />}
            {quest.world === "tundra" && <EnemyCamp world={world} />}
            {playing && quest.world === "tundra" && world.supplyCells?.map((cell, i) => <GroundSupply key={`supply-${attempt}-${i}`} world={world} cell={cell} index={i} playerPos={playerPos} active={dialogue === null && !attacked} onPickup={onSupply} supplies={supplies} />)}
            {playing && world.brigandCells?.map((cell, i) => <Monster key={`brigand-${attempt}-${i}`} id={`brigand-${attempt}-${i}`} kind="brigand" world={world} cell={cell} speed={3.4} playerPos={playerPos} onCatch={onMonsterCatch} threats={threats} attack={attack} targets={targets} onKill={onBrigandKill} active={dialogue === null} onShootPlayer={onShootPlayer} allies={allies} allyHits={allyHits} />)}
            {playing && world.bossCell && <Monster key={`boss-${attempt}`} id={`boss-${attempt}`} kind="boss" world={world} cell={world.bossCell} speed={3.2} playerPos={playerPos} onCatch={onMonsterCatch} threats={threats} attack={attack} targets={targets} onKill={onKill} pale fires={fires} active={dialogue === null} onBoss={setBoss} />}
            {playing && index === 1 && <PathGuide world={world} />}
            {phase === "finale" || phase === "victory" ? <Finale survivors={team} onFinish={() => { document.exitPointerLock?.(); setPhase("victory"); }} /> : phase === "arrival" ? <Arrival onFinish={finishArrival} /> : <Player world={world} look={look} keys={keys} playerPos={playerPos} shake={shake} attack={attack} active={playing && dialogue === null} />}
            <Weapon world={world} targets={targets} active={playing && dialogue === null} attack={attack} ammo={ammo} onAmmo={setAmmoView} reinforced={reinforced} />
            {playing && mission !== null && SURVIVORS[mission]?.kind === "collect" && pickupPositions.map((position, i) => <MissionPickup key={`${attempt}-${i}`} position={position} playerPos={playerPos} onCollect={onCollect} allies={following ? allies : undefined} />)}
            {playing && silexPositions.map((position, i) => <MissionPickup key={`silex-${index}-${attempt}-${i}`} position={position} playerPos={playerPos} onCollect={onSilex} allies={following ? allies : undefined} />)}
            {playing && (
              <Objective
                key={`goal-${index}-${attempt}`}
                position={goalPos}
                color={quest.world === "backrooms" ? "#7de2ff" : quest.world === "tundra" ? "#ffd27d" : "#ff9d5c"}
                playerPos={playerPos}
                onReach={onReach}
              />
            )}
            <Tracker playerPos={playerPos} goal={goalPos} onUpdate={setDistance} />

            {playing &&
              world.monsterCells.map((cell, i) => (
                <Monster
                  key={`${attempt}-${i}`}
                  world={world}
                  cell={cell}
                  speed={quest.monsterSpeed}
                  playerPos={playerPos}
                  id={`${index}-${attempt}-${i}`}
                  threats={threats}
                  attack={attack}
                  onCatch={onMonsterCatch}
                  pale={quest.world === "tundra"}
                  fires={quest.world === "tundra" ? fires : undefined}
                  targets={targets}
                  onKill={onKill}
                  active={dialogue === null}
                />
              ))}
            {playing && <ThreatMonitor threats={threats} attack={attack} onChase={setChasing} />}
          </Suspense>
        </Canvas>
      )}

      {phase !== "title" && <EchoLoader />}
      {playing && dialogue === null && !attacked && <MobileControls keys={keys} look={look} />}
      {playing && pickupEcho > 0 && <EchoFeedback key={pickupEcho} kind="success" />}
      {(flash || (playing && blocked)) && <EchoFeedback kind="alert" />}
      <div key={phase} className="echo-transition" aria-hidden="true" />
      {/* film grain + vignette */}
      <div className="pointer-events-none fixed inset-0 z-20 animate-grain bg-grain opacity-[0.16] mix-blend-overlay" />
      {quest.world !== "roubaix" && <div className="game-vignette pointer-events-none fixed inset-0 z-20 opacity-60" />}
      {flash && <div className="pointer-events-none fixed inset-0 z-30 animate-hit bg-blood/60" />}
      {playing && chasing && !attacked && <div className="chase-oval" aria-label="Poursuite en cours" />}

      {playing && (
        <HUD quest={quest} index={index} lives={lives} distance={distance} timeLeft={timeLeft} ammo={ammoView} kills={kills} reinforced={reinforced} mission={mission !== null ? `${SURVIVORS[mission]?.mission} · ${SURVIVORS[mission]?.kind === "hunt" ? Math.min(kills, 2) : Math.min(collected, 2)}/2${rewarded ? " · accomplie" : ""}` : null} />
      )}
      {playing && quest.world === "tundra" && <>
        <div className="expedition-hud"><p>ÉQUIPE · {team} SURVIVANTS · BRIGANDS {brigandsKilled}/10</p><p className="text-mustard">SILEX {Math.min(silex, SILEX_REQUIRED)}/{SILEX_REQUIRED} · SANTÉ {"■".repeat(hp)}{"□".repeat(PLAYER_HIT_POINTS - hp)}</p><ControlButton variant="ghost" size="sm" className="mt-2 border border-hud/30 bg-game-dark/70 text-hud" onClick={e => { e.stopPropagation(); setFollowing(v => !v); }}>{following ? "Tenir la position" : "Me suivre"}</ControlButton></div>
        <div className="boss-hud" aria-label="Boss des Rôdeurs"><p className="text-blood">LE PATRIARCHE · FORCE {boss.level}</p><progress value={boss.hp} max={boss.maxHp} /><p>{boss.hp <= 0 ? "Boss éliminé" : `${Math.ceil(boss.hp)}/${boss.maxHp} · Renforcement dans ${boss.next}s`}</p></div>
      </>}
      {playing && blocked && <p className="pointer-events-none fixed inset-x-4 top-1/4 z-30 text-center font-mono text-base text-blood">Trouve les {SILEX_REQUIRED} morceaux de silex avant de quitter la toundra ({silex}/{SILEX_REQUIRED})</p>}
      {phase === "finale" && <><div className="cinema-bar top-0" /><div className="cinema-bar bottom-0" /><div className="pointer-events-none fixed inset-x-4 bottom-[15%] z-40 text-center text-hud"><p className="font-display text-3xl">GRAND-PLACE · ROUBAIX 2026</p><p className="mt-2 text-sm">Les {team} survivants rentrent sous un ciel clair. Sila : « Nous avons gagné. Le passage est refermé derrière nous. »</p></div><ControlButton className="fixed right-5 top-[12%] z-40" onClick={() => setPhase("victory")}>Passer</ControlButton></>}
      {playing && loot && <p className="pointer-events-none fixed inset-x-4 top-1/3 z-30 text-center font-mono text-sm text-ice">{loot}</p>}
      {playing && nearPerson !== null && dialogue === null && <ControlButton className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2" onClick={(e) => { e.stopPropagation(); talk(); }}>Parler à {SURVIVORS[nearPerson]?.name}</ControlButton>}
      {dialogue !== null && <div className="dialogue-panel" role="dialog" aria-label={`Dialogue avec ${SURVIVORS[dialogue]?.name}`} onClick={e => e.stopPropagation()}>
        <p className="font-display text-2xl text-mustard">{SURVIVORS[dialogue]?.name}</p><p className="text-xs text-hud/60">{SURVIVORS[dialogue]?.role}</p>
        <p className="my-4 text-sm leading-relaxed">{rewarded && mission === dialogue ? SURVIVORS[dialogue]?.thanks : SURVIVORS[dialogue]?.request}</p>
        {mission === null && <ControlButton onClick={() => { setMission(dialogue); setCollected(0); setDialogue(null); }}>Accepter la mission</ControlButton>}
        {mission === dialogue && !rewarded && missionComplete(SURVIVORS[dialogue]?.kind ?? "collect", collected, kills) && <ControlButton onClick={() => { ammo.current.reserve += 16; setAmmoView({ ...ammo.current }); setRewarded(true); chime(true); }}>Terminer la mission · +16 munitions</ControlButton>}
        <ControlButton variant="ghost" className="ml-3" onClick={() => setDialogue(null)}>Fermer</ControlButton>
      </div>}
      {phase === "arrival" && <><div className="cinema-bar top-0" /><div className="cinema-bar bottom-0" /><div className="pointer-events-none fixed inset-x-4 bottom-[15%] z-40 text-center text-hud"><p className="font-display text-3xl">ROUBAIX · 2026</p><p className="mt-2 text-sm">Aëla : « Toutes ces maisons… et cette lumière. Nous sommes vraiment de l'autre côté. »</p></div><ControlButton className="fixed right-5 top-[12%] z-40" onClick={finishArrival}>Passer</ControlButton></>}

      {phase === "title" && (
        <Panel title>
          <div className="echo-eyebrow"><Radio size={14} /> SIGNAL RETROUVÉ · ROUBAIX</div>
          <h1 className="echo-title" data-text="ROUBAIX ECHOES">ROUBAIX<br /><span>ECHOES</span></h1>
          <p className="echo-tagline">La réalité n’a pas dit son dernier mot.</p>
          <Button onClick={() => setPhase("brief")}>Commencer l’enquête <ArrowRight /></Button>
          <div className="echo-title-stats"><span><b>03</b> MONDES</span><span><b>10</b> QUÊTES</span><span><b>19</b> SURVIVANTS</span></div>
          <p className="echo-title-footer">BACKROOMS · −10 000 · ROUBAIX 2026</p>
        </Panel>
      )}

      {phase === "brief" && (
        <Panel>
          <StoryProgress index={index} /><p className="mt-6 text-xs uppercase text-hud/55">Quête {index + 1} / 10</p>
          <h2
            className={`mt-3 font-display text-3xl md:text-4xl ${quest.special ? "text-blood" : "text-mustard"}`}
          >
            {quest.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-hud/80">{quest.brief}</p>
          <div className="mt-5 flex flex-wrap justify-center items-center gap-4 text-xs text-hud/60">
            <Hearts lives={lives} />
            <span>Rôdeurs : {quest.monsters}</span>
            {quest.timeLimit && <span className="text-blood">Chrono : {quest.timeLimit}s</span>}
          </div>
          <Button onClick={startQuest}>Commencer</Button>
        </Panel>
      )}

      {phase === "cleared" && (
        <Panel>
          <EchoFeedback kind="success" /><StoryProgress index={index} complete /><p className="mt-6 flex items-center justify-center gap-2 text-xs uppercase text-ice"><Check size={16} /> Quête réussie</p>
          <h2 className="mt-3 font-display text-3xl text-ice md:text-4xl">{quest.title}</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-hud/80">{quest.lore}</p>
          {bonus && <p className="mt-4 text-sm text-blood">+1 vie gagnée.</p>}
          <div className="mt-5">
            <Hearts lives={lives} />
          </div>
          <Button
            onClick={() => {
              setIndex((i) => i + 1);
              setPhase("brief");
            }}
          >
            Continuer
          </Button>
        </Panel>
      )}

      {phase === "gameover" && (
        <Panel>
          <h2 className="animate-flicker font-display text-5xl text-blood">TU RESTES ICI</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-hud/80">
            Le couloir se referme. Le bourdonnement reprend, à la même note. Quelque part, une autre
            version de toi ouvre la même porte.
          </p>
          <p className="mt-2 text-xs text-hud/50">Quête atteinte : {index + 1} / 10</p>
          <Button onClick={restartGame}>Recommencer</Button>
        </Panel>
      )}

      {phase === "victory" && (
        <Panel>
          <EchoFeedback kind="success" /><StoryProgress index={9} complete /><p className="mt-6 text-xs uppercase text-ice">Enquête résolue</p>
          <h2 className="mt-3 font-display text-5xl text-mustard">ROUBAIX, 2026</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-hud/80">{quest.lore}</p>
          <div className="journey-summary"><span><b>10/10</b> QUÊTES</span><span><b>{lives}</b> VIES</span><span><b>{team}</b> SURVIVANTS</span></div><ShareJourney />
          <Button onClick={restartGame}><RotateCcw /> Rejouer</Button>
        </Panel>
      )}
    </div>
  );
}

function Panel({ children, title = false }: { children: React.ReactNode; title?: boolean }) {
  return (
    <div className={`echo-panel ${title ? "echo-panel-title" : ""}`}>
      <div className="echo-panel-content text-center font-mono">{children}</div>
    </div>
  );
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <ControlButton
      onClick={onClick}
      variant="echo"
      className="mt-8 min-h-14 max-w-full whitespace-normal px-7 py-4 text-sm"
    >
      {children}
    </ControlButton>
  );
}
