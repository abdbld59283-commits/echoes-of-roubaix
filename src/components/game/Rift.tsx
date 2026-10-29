import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const BASE = 600; // far above every world so no gameplay object enters the shot
const DURATION = 12;

/** Backrooms corridor whose floor breaks open into a glowing time rift, then a fall into the -10 000 snow. */
export function Rift({ onFinish }: { onFinish: () => void }) {
  const started = useRef<number | null>(null), done = useRef(false);
  const floor = useRef<THREE.Group>(null), portal = useRef<THREE.Group>(null), tunnel = useRef<THREE.Group>(null);
  const bg = useRef<THREE.Color>(new THREE.Color('#0d0b05'));
  const tiles = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ x: (i % 4) * 1.5 - 2.25, z: Math.floor(i / 4) * 1.5 - 8, v: 0.6 + ((i * 37) % 10) / 10 })), []);
  const flakes = useMemo(() => { const a = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const r = 3 + Math.random() * 8, t = Math.random() * Math.PI * 2; a[i * 3] = Math.cos(t) * r; a[i * 3 + 1] = -Math.random() * 120; a[i * 3 + 2] = Math.sin(t) * r; } return a; }, []);
  useFrame(({ camera, scene }) => {
    if (done.current) return;
    if (started.current === null) started.current = performance.now();
    const t = (performance.now() - started.current) / 1000;
    camera.rotation.order = 'YXZ';
    const night = new THREE.Color('#0d0b05'), ice = new THREE.Color('#cfe4f2');
    if (t < 4) { // walk the corridor, lights flicker, rift glows below
      camera.position.set(Math.sin(t * 3) * 0.03, BASE + 1.7 + Math.sin(t * 6) * 0.03, 4 - t * 1.6);
      camera.rotation.set(-0.15 - t * 0.08, 0, Math.sin(t * 3) * 0.01);
      bg.current.copy(night);
    } else if (t < 6) { // floor collapses
      const p = (t - 4) / 2;
      camera.position.set(Math.sin(t * 30) * 0.06 * (1 - p), BASE + 1.7 - p * p * 3, -2.4);
      camera.rotation.set(-0.5 - p * 0.9, 0, Math.sin(t * 25) * 0.04);
      floor.current?.children.forEach((c, i) => { c.position.y = -p * p * 8 * (tiles[i]?.v ?? 1); c.rotation.x = p * (tiles[i]?.v ?? 1) * 2; });
    } else { // fall through the luminous tunnel into white snow
      const p = Math.min(1, (t - 6) / (DURATION - 6));
      camera.position.set(0, BASE - 2 - p * 110, -2.4);
      camera.rotation.set(-Math.PI / 2, p * 3, 0);
      if (tunnel.current) tunnel.current.rotation.y = t * 0.8;
      bg.current.copy(night).lerp(ice, THREE.MathUtils.smoothstep(p, 0.55, 1));
    }
    if (portal.current) portal.current.rotation.z = t * 1.5;
    scene.background = bg.current;
    if (t >= DURATION) { done.current = true; scene.background = null; onFinish(); }
  });
  return <group>
    <ambientLight intensity={0.35} color="#d8bc61" />
    <pointLight position={[0, BASE + 2.8, 0]} intensity={6} color="#f2dc8a" distance={10} />
    <pointLight position={[0, BASE - 3, -4]} intensity={40} color="#8fe3ff" distance={30} />
    {/* corridor walls and ceiling */}
    {[-3, 3].map(x => <mesh key={x} position={[x, BASE + 1.5, -2]}><boxGeometry args={[0.2, 3, 16]} /><meshStandardMaterial color="#8a7638" roughness={0.9} /></mesh>)}
    <mesh position={[0, BASE + 3, -2]}><boxGeometry args={[6, 0.1, 16]} /><meshStandardMaterial color="#6e6234" /></mesh>
    <group ref={floor}>{tiles.map((tile, i) => <mesh key={i} position={[tile.x, BASE, tile.z + 3]}><boxGeometry args={[1.45, 0.12, 1.45]} /><meshStandardMaterial color="#6f5f28" roughness={1} /></mesh>)}</group>
    <group ref={portal} position={[0, BASE - 4, -2.4]} rotation-x={-Math.PI / 2}>
      <mesh><torusGeometry args={[2.4, 0.12, 12, 48]} /><meshBasicMaterial color="#9eeaff" /></mesh>
      <mesh><circleGeometry args={[2.3, 40]} /><meshBasicMaterial color="#e8fbff" transparent opacity={0.45} /></mesh>
    </group>
    <group ref={tunnel} position={[0, BASE - 10, -2.4]}>
      {Array.from({ length: 28 }, (_, i) => <mesh key={i} position={[0, -i * 4, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[4 + Math.sin(i) * 0.6, 0.06, 6, 32]} /><meshBasicMaterial color={i % 2 ? '#7fd6ff' : '#f0f7ff'} /></mesh>)}
      <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[flakes, 3]} /></bufferGeometry><pointsMaterial color="#ffffff" size={0.12} sizeAttenuation transparent opacity={0.85} depthWrite={false} /></points>
    </group>
  </group>;
}
