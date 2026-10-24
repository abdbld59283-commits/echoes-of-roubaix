import * as THREE from "three";

function canvas(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

function finish(c: HTMLCanvasElement, repeat: number) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

/** Mustard damp wallpaper with vertical stripes and stains. */
export function wallpaperTexture(repeat = 1) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#c8ac52";
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    g.fillStyle = x % 32 === 0 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
    g.fillRect(x, 0, 8, 256);
  }
  for (let i = 0; i < 40; i++) {
    const r = 6 + Math.random() * 34;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(70,48,10,0.35)");
    grd.addColorStop(1, "rgba(70,48,10,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c, repeat);
}

/** Damp mottled carpet. */
export function carpetTexture(repeat = 24) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#8d7a38";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random();
    g.fillStyle = `rgba(${v > 0.5 ? 40 : 200},${v > 0.5 ? 34 : 180},${v > 0.5 ? 8 : 110},0.10)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return finish(c, repeat);
}

/** Stained ceiling tiles with fluorescent panels baked in. */
export function ceilingTexture(repeat = 20) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#bdb08a";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(60,50,30,0.45)";
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    g.fillStyle = "rgba(90,78,44,0.18)";
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  return finish(c, repeat);
}

/** Wind-blown snow crust. */
export function snowTexture(repeat = 40) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#dfe8f2";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(${150 + Math.random() * 60},${170 + Math.random() * 60},200,0.25)`;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    const y = Math.random() * 256;
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + 10, 160, y - 12, 256, y + 4);
    g.stroke();
  }
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return finish(c, repeat);
}

/** Red brick facade — Roubaix 2026. */
export function brickTexture(repeat = 1) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#5e2f24";
  g.fillRect(0, 0, 256, 256);
  const bh = 16;
  const bw = 42;
  for (let row = 0; row < 256 / bh; row++) {
    const off = row % 2 === 0 ? 0 : bw / 2;
    for (let x = -bw; x < 256 + bw; x += bw) {
      const v = Math.random();
      g.fillStyle = `rgb(${105 + v * 45},${48 + v * 22},${36 + v * 16})`;
      g.fillRect(x + off + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle = "rgba(20,12,10,0.25)";
    g.fillRect(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 20, 4 + Math.random() * 30);
  }
  return finish(c, repeat);
}

/** Wet dark asphalt. */
export function asphaltTexture(repeat = 30) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#1b1e24";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const v = Math.random();
    g.fillStyle = `rgba(${v > 0.7 ? 90 : 30},${v > 0.7 ? 95 : 32},${v > 0.7 ? 105 : 38},0.12)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return finish(c, repeat);
}

/** Cracked blue ice / rock. */
export function iceTexture(repeat = 2) {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  g.fillStyle = "#93a9c4";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = "rgba(230,245,255,0.5)";
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    g.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * 70;
      y += (Math.random() - 0.5) * 70;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return finish(c, repeat);
}
