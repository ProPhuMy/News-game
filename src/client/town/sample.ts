import * as THREE from 'three';
import type { Color } from '../../shared/ids.ts';
import type { PresentationPalette } from '../visuals/palette.ts';
import type { ArchitectureContext, SceneReadiness } from '../visuals/town-types.ts';
import { createBakery } from './architecture/bakery.ts';
import { createBakeryHybrid } from './architecture/bakery-hybrid.ts';
import { CITIZEN_REFERENCE_HEIGHT } from './architecture/piece.ts';
import { createSampleCharacter, type SampleCharacter, type SamplePose } from './assets/character.ts';
import { createAssetSource } from './assets/source.ts';
import { createMaterialKit } from './materials.ts';
import { createProp, type PropKind } from './props/index.ts';

export interface RenderingSampleOptions {
  container: HTMLElement; renderer: THREE.WebGLRenderer; palette: PresentationPalette;
  variant: 'code' | 'hybrid-original' | 'hybrid-palette'; view: 'street' | 'awning'; reducedMotion?: boolean;
}
export interface RenderingSample {
  whenReady(): Promise<SceneReadiness>; setTime(ms: number): void; dispose(): void;
}

const PROPS: readonly (readonly [PropKind, number, number])[] = [
  ['gas-lamp', -4.2, 3.8], ['gas-lamp', 4.2, 3.8], ['bench', -5.6, 1.4], ['newsstand', 6.6, 1.2],
  ['bush', 4.3, 0.6], ['tree-oak', -9.2, -0.6], ['tree-round', 9.6, -1],
  ['flowers', 0.6, 2.9], ['flowers', 1.3, 2.9], ['flowers', 2, 2.9],
];
const ACTORS: readonly { pose: SamplePose; paper: Color | null; x: number; z: number }[] = [
  { pose: 'idle', paper: 'red', x: -1.6, z: 3.7 },
  { pose: 'walk', paper: 'blue', x: -5.5, z: 6.6 },
  { pose: 'run', paper: 'green', x: -2.4, z: 7.4 },
  { pose: 'read', paper: 'gold', x: 1, z: 6.6 },
  { pose: 'cheer', paper: null, x: 5.2, z: 6.6 },
];

/** Isolated art sample. The harness owns the renderer and canvas; no animation loop or gameplay clock. */
export function createRenderingSample(options: RenderingSampleOptions): RenderingSample {
  const { renderer, palette } = options;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(palette.town.sky);
  const materials = createMaterialKit(palette);
  const assets = createAssetSource();
  const ctx: ArchitectureContext = { palette, materials, assets };
  const pieces = [options.variant === 'code' ? createBakery(ctx)
    : createBakeryHybrid(ctx, options.variant === 'hybrid-original' ? 'original' : 'palette')];
  for (const [kind, x, z] of PROPS) {
    const piece = createProp(kind, ctx); piece.object.position.set(x, 0, z); pieces.push(piece);
  }
  for (const piece of pieces) scene.add(piece.object);
  const ground: THREE.Mesh[] = [];
  function slab(width: number, depth: number, hex: number, y: number, z: number): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, depth), materials.surface(hex));
    mesh.position.set(0, y, z); mesh.receiveShadow = true; ground.push(mesh); scene.add(mesh);
  }
  slab(48, 40, palette.town.ground, -0.05, 0);
  slab(48, 2.4, palette.town.plaza, -0.02, 3.7);
  slab(48, 3.4, palette.town.road, -0.03, 6.6);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight(palette.town.sky, palette.town.ground, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(10, 20, 14); sun.target.position.set(0, 0, 2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
  sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.0001;
  scene.add(sun, sun.target);
  const aspect = (options.container.clientWidth || 1280) / (options.container.clientHeight || 720);
  const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 300);
  const framing = Math.max(1, (1280 / 720) / aspect);
  const position = options.view === 'street' ? new THREE.Vector3(0, 17, 27) : new THREE.Vector3(1.5, 6.5, 11);
  const target = options.view === 'street' ? new THREE.Vector3(0, 2.6, 1) : new THREE.Vector3(0.4, 4, 2.4);
  camera.position.copy(position.sub(target).multiplyScalar(framing).add(target)); camera.lookAt(target);
  const actors = new Map<number, SampleCharacter>();
  let disposed = false; let readyToRender = false;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const actor of actors.values()) actor.dispose();
    for (const piece of pieces) piece.dispose();
    for (const mesh of ground) mesh.geometry.dispose();
    materials.dispose(); assets.dispose();
    sun.shadow.dispose(); scene.clear();
  }
  const characterLoads = ACTORS.map(async (placement, index) => {
    const actor = await createSampleCharacter(ctx, {
      modelUrl: '/models/characters/kenney-mini/character-male-a.glb',
      height: CITIZEN_REFERENCE_HEIGHT, paper: placement.paper,
    });
    if (disposed) { actor.dispose(); throw new Error('rendering sample disposed before readiness'); }
    actor.object.position.set(placement.x, 0, placement.z);
    actors.set(index, actor); scene.add(actor.object);
  });
  const ready = Promise.all([Promise.all(pieces.map(piece => piece.ready)), Promise.all(characterLoads)])
    .then(([readiness]) => {
      if (disposed) throw new Error('rendering sample disposed before readiness');
      readyToRender = true;
      return { degraded: readiness.flatMap(item => item.degraded) };
    }).catch((error: unknown) => { dispose(); throw error; });
  // A caller may dispose while imports are in flight without awaiting readiness.
  void ready.catch(() => {});
  return {
    whenReady: () => ready,
    setTime(ms) {
      if (disposed) throw new Error('rendering sample disposed');
      if (!Number.isFinite(ms) || ms < 0) throw new Error('sample time must be nonnegative');
      if (!readyToRender) throw new Error('rendering sample not ready');
      for (const [index, actor] of actors.entries()) actor.setPose(ACTORS[index]!.pose, ms / 1000, options.reducedMotion);
      renderer.render(scene, camera);
    },
    dispose,
  };
}
