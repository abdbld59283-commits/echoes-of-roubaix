import { useEffect, useRef } from "react";

export function useKeyboard() {
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  return keys;
}

export interface Look {
  yaw: number;
  pitch: number;
}

export function usePointerLook(
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const look = useRef<Look>({ yaw: 0, pitch: 0 });
  const locked = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onClick = (event: MouseEvent) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      if (event.target instanceof Element && event.target.closest("button, [role=dialog]")) return;
      if (document.pointerLockElement !== el) void el.requestPointerLock?.()?.catch(() => {});
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      look.current.yaw -= e.movementX * 0.0022;
      look.current.pitch -= e.movementY * 0.0022;
      look.current.pitch = Math.max(-1.2, Math.min(1.2, look.current.pitch));
    };
    const onLockChange = () => {
      locked.current = document.pointerLockElement === el;
    };

    el.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [containerRef, enabled]);

  return { look, locked };
}
