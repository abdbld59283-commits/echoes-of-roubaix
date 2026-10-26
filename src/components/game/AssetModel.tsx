import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import humanMan from '@/assets/models/human-man.glb?url';
import humanWoman from '@/assets/models/human-woman.glb?url';
import pistol from "@/assets/models/pistol.glb?url";
import tent from "@/assets/models/tent.glb?url";
import bedroll from "@/assets/models/bedroll.glb?url";
import crate from "@/assets/models/crate.glb?url";
import house from "@/assets/models/house.glb?url";
import tree from "@/assets/models/tree.glb?url";

export const MODELS = { pistol: { url: pistol }, aela: { url: humanWoman }, narek: { url: humanMan }, sila: { url: humanWoman }, tent: { url: tent }, bedroll: { url: bedroll }, crate: { url: crate }, house: { url: house }, tree: { url: tree } };
export function AssetModel({ model, height = 1.8, animation = 'idle', ...props }: {
  model: keyof typeof MODELS; height?: number; animation?: string; position?: [number, number, number]; rotation?: [number, number, number];
}) {
  const { scene, animations } = useGLTF(MODELS[model].url);
  const object = useMemo(() => {
    const copy = clone(scene);
    const bounds = new THREE.Box3().setFromObject(copy);
    copy.scale.setScalar(height / (bounds.getSize(new THREE.Vector3()).y || 1));
    const scaled = new THREE.Box3().setFromObject(copy);
    const center = scaled.getCenter(new THREE.Vector3());
    copy.position.set(-center.x, -scaled.min.y, -center.z);
    copy.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    return copy;
  }, [scene, height]);
  const human = model === 'aela' || model === 'narek' || model === 'sila';
  const clips = useMemo(() => {
    if (!human) return animations;
    const walk = animations.find(clip => clip.name === 'walk');
    if (!walk) return animations;
    const poses = ['idle', 'holding-right', 'holding-right-shoot', 'holding-both', 'pick-up', 'emote-yes'].map(name => {
      const clip = walk.clone(); clip.name = name;
      clip.tracks = clip.tracks.map(track => {
        const frozen = track.clone();
        frozen.times = new Float32Array([0]);
        frozen.values = new Float32Array(track.values.slice(0, track.getValueSize()));
        return frozen;
      });
      clip.duration = 1; return clip;
    });
    const run = animations.find(clip => clip.name === 'run')?.clone();
    if (run) { run.name = 'sprint'; poses.push(run); }
    return [...animations, ...poses];
  }, [animations, human]);
  const { actions } = useAnimations(clips, object);
  const bones = useMemo(() => {
    const rightArm = object.getObjectByName('RightArm'), rightFore = object.getObjectByName('RightForeArm'), head = object.getObjectByName('Head'), spine = object.getObjectByName('Spine');
    return { rightArm, rightFore, head, spine };
  }, [object]);
  useFrame(({ clock }, rawDt) => {
    if (!human) return;
    const dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
    const holding = animation.startsWith('holding');
    if (holding && bones.rightArm) bones.rightArm.rotateX(-0.95);
    if (holding && bones.rightFore) bones.rightFore.rotateX(-0.5);
    if (animation === 'holding-right-shoot' && bones.rightFore) bones.rightFore.rotateX(Math.sin(t * 30) * 0.07);
    if (bones.head && animation !== 'walk' && animation !== 'sprint') bones.head.rotateY(Math.sin(t * 0.55) * 0.065);
    if (bones.spine && animation !== 'walk' && animation !== 'sprint') bones.spine.rotateX(Math.sin(t * 1.8) * 0.008);
    if (animation === 'pick-up' && bones.spine) bones.spine.rotateX(0.35);
  });
  const current = useRef<THREE.AnimationAction | null>(null);
  useEffect(() => {
    const next = actions[animation] ?? actions['idle'] ?? Object.values(actions)[0];
    if (!next || next === current.current) return;
    const prev = current.current;
    current.current = next;
    next.reset().setEffectiveTimeScale(animation === 'walk' ? 1.15 : 1).fadeIn(0.35).play();
    if (!prev) return;
    prev.fadeOut(0.35);
    const timer = setTimeout(() => prev.stop(), 400);
    return () => clearTimeout(timer);
  }, [actions, animation]);
  useEffect(() => () => { current.current?.stop(); current.current = null; }, []);
  return <group {...props}><primitive object={object} /></group>;
}