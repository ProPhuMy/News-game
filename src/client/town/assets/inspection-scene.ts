import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SceneReadiness } from '../../visual-test/settle.ts';
import { PAPER_COLOR_HEX } from '../citizens.ts';

export interface InspectionSceneOptions {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  modelUrl: string;
  clip: string | null;
}

export interface InspectionScene {
  whenReady(): Promise<SceneReadiness & { clips: readonly string[] }>;
  setTime(ms: number): void;
  dispose(): void;
}

/** D0-only inspection entry point. The caller owns the supplied renderer; this scene owns its loaded assets. */
export function createInspectionScene(options: InspectionSceneOptions): InspectionScene {
  if (!/^\/models\/characters\/(?:[\w-]+\/)*[\w-]+\.(?:glb|gltf)$/.test(options.modelUrl)) {
    throw new Error('inspection model must be a local /models/characters/ GLB or glTF');
  }
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
  let mixer: THREE.AnimationMixer | null = null;
  let action: THREE.AnimationAction | null = null;
  let disposed = false;
  let ready = false;

  function release(root: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
      if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
    });
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    root.removeFromParent();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (model) {
      mixer?.stopAllAction();
      mixer?.uncacheRoot(model);
      release(model); model = null;
    }
    scene.clear();
  }

  const loaded = new GLTFLoader().loadAsync(options.modelUrl).then(gltf => {
    if (disposed) { release(gltf.scene); throw new Error('inspection disposed before asset readiness'); }
    model = gltf.scene;
    scene.add(model);
    const bounds = new THREE.Box3().setFromObject(model, true);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const head = model.getObjectByName('head');
    if (head) {
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: PAPER_COLOR_HEX.red }));
      head.add(hat);
      hat.position.copy(head.worldToLocal(new THREE.Vector3(center.x, bounds.max.y + 0.04, center.z)));
    }
    const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(17.5))) * 1.4;
    camera.position.set(center.x + distance * 0.18, center.y + distance * 0.12, center.z + distance);
    camera.lookAt(center); camera.updateMatrixWorld();
    if (options.clip !== null) {
      const clip = gltf.animations.find(item => item.name === options.clip);
      if (!clip) throw new Error(`unknown clip: ${options.clip}`);
      mixer = new THREE.AnimationMixer(model);
      action = mixer.clipAction(clip); action.play();
    }
    ready = true;
    return { degraded: [], clips: gltf.animations.map(clip => clip.name) };
  }).catch((error: unknown) => { dispose(); throw error; });

  return {
    whenReady: () => loaded,
    setTime(ms: number): void {
      if (!Number.isFinite(ms) || ms < 0) throw new Error('inspection time must be finite and nonnegative');
      if (!ready || disposed) throw new Error('inspection is not ready or is disposed');
      if (mixer && action) {
        // Reset the action as well as the mixer: reverse time must reproduce the original pose.
        action.reset().play(); mixer.setTime(ms / 1000);
      }
      scene.updateMatrixWorld(true);
      options.renderer.render(scene, camera);
    },
    dispose,
  };
}
