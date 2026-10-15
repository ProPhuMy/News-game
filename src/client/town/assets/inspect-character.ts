import * as THREE from 'three';

export interface CharacterInspection {
  triangles: number;
  materials: number;
  bounds: { width: number; height: number; depth: number };
  bones: string[];
  clips: { name: string; duration: number; tracks: number; unboundTracks: string[] }[];
}

/** D0 import report; reads the model without changing its hierarchy, materials or animation pose. */
export function inspectCharacter(root: THREE.Object3D, clips: readonly THREE.AnimationClip[]): CharacterInspection {
  let triangles = 0;
  const materials = new Set<THREE.Material>();
  const bones = new Set<string>();
  root.updateWorldMatrix(true, true);
  root.traverse(object => {
    if (object instanceof THREE.Bone) bones.add(object.name);
    if (object instanceof THREE.Mesh) {
      const positions = object.geometry.getAttribute('position');
      triangles += (object.geometry.index?.count ?? positions?.count ?? 0) / 3;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
      }
    }
  });
  const size = new THREE.Box3().setFromObject(root, true).getSize(new THREE.Vector3());
  return {
    triangles,
    materials: materials.size,
    bounds: { width: size.x, height: size.y, depth: size.z },
    bones: [...bones].sort(),
    clips: clips.map(clip => ({
      name: clip.name,
      duration: clip.duration,
      tracks: clip.tracks.length,
      unboundTracks: clip.tracks.filter(track => {
        const { nodeName } = THREE.PropertyBinding.parseTrackName(track.name);
        return !THREE.PropertyBinding.findNode(root, nodeName);
      }).map(track => track.name),
    })),
  };
}
