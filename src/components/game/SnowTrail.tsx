import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useScenePalette } from '@/game/scenePalette';
import { snowTexture } from '@/game/textures';

/** Bounded local snow surface; footprints depress actual vertices, not a decal. */
export function SnowTrail({ playerPos }: { playerPos: THREE.Vector3 }) {
  const mesh = useRef<THREE.Mesh>(null), last = useRef(new THREE.Vector3(Infinity, 0, Infinity));
  const tracks = useRef<{ x: number; z: number }[]>([]), tick = useRef(0);
  const geometry = useMemo(() => new THREE.PlaneGeometry(24, 24, 64, 64), []);
  const texture = useMemo(() => snowTexture(3), []);
  const palette = useScenePalette();
  useEffect(() => () => { geometry.dispose(); texture.dispose(); }, [geometry, texture]);
  useFrame((_, raw) => {
    if (!mesh.current) return;
    tick.current -= Math.min(raw, 0.05);
    if (tick.current > 0) return;
    tick.current = 0.2;
    if (Math.hypot(last.current.x - playerPos.x, last.current.z - playerPos.z) > 0.7) {
      tracks.current.push({ x: playerPos.x + (tracks.current.length % 2 ? 0.14 : -0.14), z: playerPos.z });
      if (tracks.current.length > 48) tracks.current.shift();
      last.current.copy(playerPos);
    }
    const x = Math.round(playerPos.x / 4) * 4, z = Math.round(playerPos.z / 4) * 4;
    mesh.current.position.set(x, 0.08, z);
    const attr = geometry.getAttribute('position');
    for (let i = 0; i < attr.count; i++) {
      const wx = attr.getX(i) + x, wz = -attr.getY(i) + z;
      let depression = 0;
      for (const foot of tracks.current) { const d = Math.hypot(wx - foot.x, (wz - foot.z) * 0.65); if (d < 0.4) depression = Math.max(depression, (1 - d / 0.4) * 0.065); }
      attr.setZ(i, -depression);
    }
    attr.needsUpdate = true; geometry.computeVertexNormals();
  });
  if (!palette) return null;
  return <mesh ref={mesh} geometry={geometry} rotation-x={-Math.PI / 2} receiveShadow><meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.045} color={palette.snow} roughness={0.86} /></mesh>;
}