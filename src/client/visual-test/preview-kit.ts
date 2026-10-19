// Harness-only stand-ins for Codex's D1 MaterialKit and AssetSource, so the C2 architecture sample can render before
// D1 exists. Not an art proposal: Codex's toon materials, outlines and asset cache replace these in D1.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetSource, MaterialKit } from '../visuals/town-types.ts';

const OUTLINE_SCALE = 1.03;

export function createPreviewKit(outlineHex: number): MaterialKit {
  const surfaces = new Map<string, THREE.Material>();
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: outlineHex, side: THREE.BackSide });
  const outlined = new WeakSet<THREE.Mesh>();
  return {
    surface(hex, options) {
      const key = `${hex}:${options?.emissive ?? 'none'}`;
      let material = surfaces.get(key);
      if (!material) {
        material = new THREE.MeshToonMaterial({
          color: hex,
          emissive: options?.emissive ?? 0x000000,
          emissiveIntensity: options?.emissive === undefined ? 0 : 0.7,
        });
        surfaces.set(key, material);
      }
      return material;
    },
    outline(object) {
      // Inverted hull: a slightly larger back-face copy of each mesh in the outline color.
      const targets: THREE.Mesh[] = [];
      object.traverse((child) => { if (child instanceof THREE.Mesh && !outlined.has(child)) targets.push(child); });
      for (const mesh of targets) {
        const hull = new THREE.Mesh(mesh.geometry, outlineMaterial);
        hull.scale.setScalar(OUTLINE_SCALE);
        outlined.add(mesh);
        outlined.add(hull);
        mesh.add(hull);
      }
    },
  };
}

export function createPreviewAssets(): AssetSource {
  const loader = new GLTFLoader();
  const cache = new Map<string, Promise<THREE.Group>>();
  return {
    loadGltf(url) {
      let scene = cache.get(url);
      if (!scene) {
        scene = loader.loadAsync(url).then((gltf) => gltf.scene);
        cache.set(url, scene);
      }
      return scene.then((group) => group.clone(true));
    },
  };
}
