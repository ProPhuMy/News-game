import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AssetSource } from '../../visuals/town-types.ts';

/** Owns imported resources. Callers own each returned rig's mixer and cloned skeletons. */
export function createAssetSource(): AssetSource & { dispose(): void } {
  const loader = new GLTFLoader();
  const cache = new Map<string, Promise<THREE.Group>>();
  const loaded = new Set<THREE.Group>();
  let disposed = false;

  function release(roots: Iterable<THREE.Group>): void {
    const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.Skeleton>();
    for (const root of roots) {
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        resources.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          resources.add(material);
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) resources.add(value);
          }
        }
        if (object instanceof THREE.SkinnedMesh) resources.add(object.skeleton);
      });
    }
    for (const resource of resources) resource.dispose();
  }

  return {
    async loadGltf(url) {
      if (disposed) throw new Error('asset source disposed');
      if (!/^\/models\/(?:[\w-]+\/)*[\w-]+\.(?:glb|gltf)$/.test(url)) {
        throw new Error('asset must be a local /models/ GLB or glTF');
      }
      let pending = cache.get(url);
      if (!pending) {
        pending = loader.loadAsync(url).then(gltf => {
          if (disposed) {
            release([gltf.scene]);
            throw new Error('asset source disposed before readiness');
          }
          gltf.scene.animations = gltf.animations;
          loaded.add(gltf.scene);
          return gltf.scene;
        }).catch((error: unknown) => {
          cache.delete(url);
          throw error;
        });
        cache.set(url, pending);
      }
      const scene = await pending;
      if (disposed) throw new Error('asset source disposed before readiness');
      const instance = clone(scene);
      if (!(instance instanceof THREE.Group)) throw new Error('asset scene must be a Group');
      return instance;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(loaded);
      loaded.clear();
      cache.clear();
    },
  };
}
