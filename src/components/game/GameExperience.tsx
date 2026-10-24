import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Radio, RotateCcw, Share2, Check, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Look } from "@/game/input";
import artwork from "@/assets/roubaix-echoes.jpg";

export function EchoBackdrop() {
  return <div className="echo-backdrop" aria-hidden="true"><img src={artwork} width={1536} height={1024} alt="" /><div className="echo-backdrop-shade" /></div>;
}

export function EchoLoader() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return <div className="echo-loading" role="status"><div className="echo-radar"><Radio size={28} /></div><p>RECHERCHE DU SIGNAL</p><span>{Math.round(progress)} %</span></div>;
}

export function EchoFeedback({ kind }: { kind: "success" | "alert" }) {
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(kind === "success" ? [30, 40, 30] : [80, 40, 80]);
  }, [kind]);
  return <div className={`echo-feedback echo-feedback-${kind}`} aria-hidden="true"><span /><span /></div>;
}

export function StoryProgress({ index, complete = false }: { index: number; complete?: boolean }) {
  const chapter = index < 3 ? 1 : index < 9 ? 2 : 3;
  return <div className="story-progress" aria-label={`Chapitre ${chapter} sur 3, quête ${index + 1} sur 10`}>
    <div className="story-chapters">{["BACKROOMS", "TOUNDRA", "ROUBAIX"].map((name, i) => <span key={name} className={chapter === i + 1 ? "text-ice" : "text-hud/45"}><span className="story-number">0{i + 1}</span>{name}</span>)}</div>
    <div className="story-track">{Array.from({ length: 10 }, (_, i) => <span key={i} className={i < index || (i === index && complete) ? "bg-ice" : i === index ? "bg-mustard" : "bg-hud/15"} />)}</div>
  </div>;
}

export function MobileControls({ keys, look }: { keys: RefObject<Set<string>>; look: RefObject<Look> }) {
  const pointers = useRef(new Map<number, string>());
  const touchPosition = useRef<{ id: number; x: number; y: number } | null>(null);
  const [sprint, setSprint] = useState(false);
  useEffect(() => {
    const held = pointers.current;
    const release = () => { for (const key of held.values()) keys.current.delete(key); held.clear(); keys.current.delete("ShiftLeft"); };
    window.addEventListener("blur", release);
    return () => { release(); window.removeEventListener("blur", release); };
  }, [keys]);
  const release = (pointerId: number) => {
    const code = pointers.current.get(pointerId); pointers.current.delete(pointerId);
    if (code && ![...pointers.current.values()].includes(code)) keys.current.delete(code);
  };
  const move = (code: string, label: string, Icon: typeof ArrowUp) => <Button variant="ghost" className="touch-key" aria-label={label} title={label}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, code); keys.current.add(code); }}
    onPointerUp={e => release(e.pointerId)} onPointerCancel={e => release(e.pointerId)} onLostPointerCapture={e => release(e.pointerId)}><Icon /></Button>;
  return <div className="mobile-controls">
    <div className="touch-look" aria-label="Orientation de la caméra" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); touchPosition.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; }} onPointerMove={e => { const previous = touchPosition.current; if (!previous || previous.id !== e.pointerId || !e.currentTarget.hasPointerCapture(e.pointerId)) return; look.current.yaw -= (e.clientX - previous.x) * 0.006; look.current.pitch = Math.max(-1.2, Math.min(1.2, look.current.pitch - (e.clientY - previous.y) * 0.006)); touchPosition.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; }} onPointerUp={() => { touchPosition.current = null; }} onPointerCancel={() => { touchPosition.current = null; }} />
    <div className="touch-movement">{move("KeyW", "Avancer", ArrowUp)}<div>{move("KeyA", "Aller à gauche", ArrowLeft)}{move("KeyS", "Reculer", ArrowDown)}{move("KeyD", "Aller à droite", ArrowRight)}</div></div>
    <div className="touch-actions"><Button variant="ghost" className="touch-key" aria-label="Courir" title="Courir" aria-pressed={sprint} onClick={() => { setSprint(v => !v); if (sprint) keys.current.delete("ShiftLeft"); else keys.current.add("ShiftLeft"); }}><Footprints /></Button><Button variant="ghost" className="touch-key" aria-label="Recharger" title="Recharger" onClick={() => window.dispatchEvent(new Event("echo-reload"))}><RotateCcw /></Button><Button variant="ghost" className="touch-key touch-fire" aria-label="Tirer" title="Tirer" onClick={() => window.dispatchEvent(new Event("echo-fire"))}><Crosshair /></Button></div>
  </div>;
}

export function ShareJourney() {
  const [status, setStatus] = useState("");
  const share = async () => {
    const data = { title: "Roubaix Echoes — Enquête résolue", text: "J'ai résolu les mystères de Roubaix sur Roubaix Echoes ! 🕵️‍♂️", url: "https://roubaix-echoes-game.lovable.app" };
    try {
      if (navigator.share) { await navigator.share(data); setStatus("Parcours partagé"); }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${data.text} ${data.url}`); setStatus("Lien copié"); }
      else setStatus(data.url);
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setStatus("Partage indisponible. Réessaie."); }
  };
  return <div><Button variant="echo" className="mt-4" onClick={share}>{status === "Lien copié" ? <Check /> : <Share2 />} Partager mon parcours</Button><p role="status" className="mt-3 text-xs text-ice">{status}</p></div>;
}