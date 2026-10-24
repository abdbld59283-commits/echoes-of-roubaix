import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { guidanceRoute, nearbyResource } from '@/game/assistance';
import { cellToWorld, type World } from '@/game/maze';
import { useScenePalette } from '@/game/scenePalette';

export function FlintGuide({ world, playerPos, resources }: { world: World; playerPos: THREE.Vector3; resources: React.RefObject<Map<string, { x: number; z: number }>> }) {
  const marks = useRef<THREE.InstancedMesh>(null), label = useRef<HTMLSpanElement>(null);
  const timer = useRef(0), dummy = useMemo(() => new THREE.Object3D(), []);
  const palette = useScenePalette();
  useFrame(({ camera }, raw) => {
    timer.current -= Math.min(raw, 0.05);
    if (timer.current > 0 || !marks.current) return;
    timer.current = 0.45;
    const flint = [...resources.current.entries()].filter(([id]) => id.startsWith('flint')).map(([, p]) => p);
    // Guidance can show a distant fragment; companion jobs stay locally bounded.
    const target = nearbyResource(flint, playerPos, playerPos) ?? flint.sort((a, b) => Math.hypot(a.x - playerPos.x, a.z - playerPos.z) - Math.hypot(b.x - playerPos.x, b.z - playerPos.z))[0];
    const route = target ? guidanceRoute(world, playerPos, target) : [];
    const visible = route.slice(1, 33);
    visible.forEach((cell, i) => { const p = cellToWorld(world.size, cell.x, cell.z); dummy.position.set(p.x, 0.04, p.z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); marks.current?.setMatrixAt(i, dummy.matrix); });
    marks.current.count = visible.length; marks.current.instanceMatrix.needsUpdate = true; marks.current.computeBoundingSphere();
    if (label.current) {
      if (!target) { label.current.textContent = ''; return; }
      const next = visible[0] ? cellToWorld(world.size, visible[0].x, visible[0].z) : target;
      const forward = camera.getWorldDirection(dummy.position);
      const yaw = Math.atan2(-forward.x, -forward.z);
      const angle = Math.atan2(next.x - playerPos.x, -(next.z - playerPos.z)) + yaw;
      const relative = Math.atan2(Math.sin(angle), Math.cos(angle));
      label.current.textContent = `${Math.abs(relative) < 0.55 ? '↑' : relative > 0 ? '→' : '←'} SILEX · ${Math.round(Math.hypot(target.x - playerPos.x, target.z - playerPos.z))} m`;
    }
  });
  if (!palette) return null;
  return <><instancedMesh ref={marks} args={[undefined, undefined, 32]} frustumCulled={false}><ringGeometry args={[0.15, 0.3, 12]} /><meshBasicMaterial color={palette.signal} depthWrite={false} /></instancedMesh><Html fullscreen style={{ pointerEvents: 'none' }}><div className="flint-compass"><span ref={label} /></div></Html></>;
}