import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import pistol from "@/assets/models/pistol.glb?url";
import aela from "@/assets/models/aela.glb?url";
import narek from "@/assets/models/narek.glb?url";
import sila from "@/assets/models/sila.glb?url";
import tent from "@/assets/models/tent.glb?url";
import bedroll from "@/assets/models/bedroll.glb?url";
import crate from "@/assets/models/crate.glb?url";
import house from "@/assets/models/house.glb?url";
import tree from "@/assets/models/tree.glb?url";

export const MODELS = { pistol, aela, narek, sila, tent, bedroll, crate, house, tree };
export function AssetModel({ model, height = 1.8, ...props }: {
  model: keyof typeof MODELS; height?: number; position?: [number, number, number]; rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(MODELS[model].url);
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
  return <group {...props}><primitive object={object} /></group>;
}