import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SceneReadiness } from '../../visual-test/settle.ts';
import { PAPER_COLOR_HEX } from '../citizens.ts';

export interface InspectionSceneOptions {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  modelUrl: string;
  clip: string | null;
  count?: number;
}

export interface InspectionScene {
  whenReady(): Promise<SceneReadiness & { clips: readonly string[]; instances: number }>;
  setTime(ms: number): void;
  dispose(): void;
}

/** D0-only inspection entry point. The caller owns the supplied renderer; this scene owns its loaded assets. */
export function createInspectionScene(options: InspectionSceneOptions): InspectionScene {
  if (!/^\/models\/characters\/(?:[\w-]+\/)*[\w-]+\.(?:glb|gltf)$/.test(options.modelUrl)) {
    throw new Error('inspection model must be a local /models/characters/ GLB or glTF');
  }
  const count = options.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error('inspection count must be an integer from 1 to 30');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe5e8eb);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x65717a, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(2, 4, 5); scene.add(light);
  const width = options.container.clientWidth || 1280;
  const height = options.container.clientHeight || 720;
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);
  options.renderer.setSize(width, height, false);
  options.renderer.setPixelRatio(1);
  let model: THREE.Group | null = null;
  const animations: { root: THREE.Object3D; mixer: THREE.AnimationMixer; action: THREE.AnimationAction }[] = [];
  let disposed = false;
  let ready = false;

  function release(root: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const skeletons = new Set<THREE.Skeleton>();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    });
    for (const skeleton of skeletons) skeleton.dispose();
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    root.removeFromParent();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (model) {
      for (const { mixer, root } of animations) { mixer.stopAllAction(); mixer.uncacheRoot(root); }
      animations.length = 0;
      release(model); model = null;
    }
    scene.clear();
  }

  const loaded = new GLTFLoader().loadAsync(options.modelUrl).then(gltf => {
    if (disposed) { release(gltf.scene); throw new Error('inspection disposed before asset readiness'); }
    model = new THREE.Group();
    scene.add(model);
    const instances = [gltf.scene, ...Array.from({ length: count - 1 }, () => clone(gltf.scene))];
    const nativeBounds = new THREE.Box3().setFromObject(gltf.scene, true);
    const center = nativeBounds.getCenter(new THREE.Vector3());
    const size = nativeBounds.getSize(new THREE.Vector3());
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const hatGeometry = new THREE.CylinderGeometry(0.17, 0.19, 0.08, 12);
    const hatMaterial = new THREE.MeshStandardMaterial({ color: PAPER_COLOR_HEX.red });
    let hats = 0;
    for (const [index, instance] of instances.entries()) {
      model.add(instance);
      const head = instance.getObjectByName('head');
      if (head) {
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        head.add(hat);
        hat.position.copy(head.worldToLocal(new THREE.Vector3(center.x, nativeBounds.max.y + 0.04, center.z)));
        hats++;
      }
      instance.position.x += (index % columns - (columns - 1) / 2) * size.x * 1.25;
      instance.position.z += (Math.floor(index / columns) - (rows - 1) / 2) * Math.max(size.y, size.z) * 1.5;
      if (options.clip !== null) {
        const clip = gltf.animations.find(item => item.name === options.clip);
        if (!clip) throw new Error(`unknown clip: ${options.clip}`);
        const mixer = new THREE.AnimationMixer(instance);
        const action = mixer.clipAction(clip); action.play();
        animations.push({ root: instance, mixer, action });
      }
    }
    if (hats === 0) { hatGeometry.dispose(); hatMaterial.dispose(); }
    ready = true;
    return { degraded: [], clips: gltf.animations.map(clip => clip.name), instances: instances.length };
  }).catch((error: unknown) => { dispose(); throw error; });

  return {
    whenReady: () => loaded,
    setTime(ms: number): void {
      if (!Number.isFinite(ms) || ms < 0) throw new Error('inspection time must be finite and nonnegative');
      if (!ready || disposed) throw new Error('inspection is not ready or is disposed');
      for (const { mixer, action } of animations) {
        // Reset the action as well as the mixer: reverse time must reproduce the original pose.
        action.reset().play(); mixer.setTime(ms / 1000);
      }
      scene.updateMatrixWorld(true);
      // Frame the current skinned pose including hats, not the smaller bind-pose bounds.
      const sphere = new THREE.Box3().setFromObject(model!, true).getBoundingSphere(new THREE.Sphere());
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance = Math.max(0.1, sphere.radius) / Math.sin(Math.min(vertical, horizontal)) * 1.15;
      camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(0.35, 0.65, 1).normalize(), distance);
      camera.far = Math.max(100, distance + sphere.radius * 2);
      camera.updateProjectionMatrix();
      camera.lookAt(sphere.center); camera.updateMatrixWorld();
      options.renderer.render(scene, camera);
    },
    dispose,
  };
}
