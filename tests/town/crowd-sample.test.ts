import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { characterBounds, createCrowdComparison } from '../../src/client/town/crowd-sample.ts';

describe('visible character measurement', () => {
  it('excludes hidden geometry, outlines and accessories from body bounds', () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1)));
    const hidden = new THREE.Group(); hidden.visible = false;
    hidden.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100))); root.add(hidden);
    const hat = new THREE.Group(); hat.name = 'paper-hat';
    const brim = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 3)); brim.position.y = 2; hat.add(brim); root.add(hat);
    const page = new THREE.Group(); page.name = 'reading-paper'; page.visible = false;
    page.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20))); root.add(page);
    const outline = new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200)); outline.name = 'toon-outline'; root.add(outline);
    expect(characterBounds(root, true).getSize(new THREE.Vector3()).toArray()).toEqual([2, 3, 1]);
    expect(characterBounds(root, false).getSize(new THREE.Vector3()).toArray()).toEqual([4, 4, 3]);
    root.traverse(child => { if (child instanceof THREE.Mesh) child.geometry.dispose(); });
  });
});

vi.mock('../../src/client/town/assets/source.ts', () => ({
  createAssetSource: vi.fn(() => ({ loadGltf: vi.fn(), dispose: vi.fn() })),
}));
vi.mock('../../src/client/town/buildings.ts', () => ({
  createTownBuildings: () => ({ group: new THREE.Group(), ready: Promise.resolve({ degraded: [] }), dispose: vi.fn() }),
}));
vi.mock('../../src/client/town/assets/character.ts', () => ({ createSampleCharacter: vi.fn() }));
import { createSampleCharacter } from '../../src/client/town/assets/character.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';

it('renders all thirty on identical slots and reports scale-dependent overlap without disposing the borrowed renderer', async () => {
  vi.mocked(createSampleCharacter).mockImplementation(async (_ctx, options) => {
    const object = new THREE.Group();
    object.add(new THREE.Mesh(new THREE.BoxGeometry(options.height, options.height, options.height * 0.6)));
    return { object, setPaper: vi.fn(), setPose: vi.fn(), dispose: vi.fn() };
  });
  const results = [];
  for (const height of [3.29, 1.5]) {
    const renderer = { domElement: {}, shadowMap: { enabled: false, type: 0 }, render: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
    const scene = createCrowdComparison({ container: { clientWidth: 1280, clientHeight: 720 } as HTMLElement,
      renderer, palette: getPalette('b'), height });
    const report = await scene.whenReady(); scene.setTime(0);
    expect(report.instances).toBe(30);
    expect(report.metrics.minimumCenterDistance).toBeGreaterThan(1);
    expect(report.metrics.bodySize.height).toBeCloseTo(height, 5);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    results.push(report.metrics);
    scene.dispose(); scene.dispose();
    expect(renderer.dispose).not.toHaveBeenCalled();
  }
  expect(results[0]!.bodyOverlapPairs).toBeGreaterThan(results[1]!.bodyOverlapPairs);
  expect(results[1]!.bodyOverlapPairs).toBe(0);
  expect(results[1]!.bodyOutsideClearance).toBe(0);
});

it('releases late comparison actors after disposal', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const actors = Array.from({ length: 30 }, () => ({ object: new THREE.Group(), setPaper: vi.fn(), setPose: vi.fn(), dispose: vi.fn() }));
  let i = 0;
  vi.mocked(createSampleCharacter).mockImplementation(async () => { const actor = actors[i++]!; await gate; return actor; });
  const renderer = { domElement: {}, shadowMap: { enabled: false, type: 0 }, render: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
  const sample = createCrowdComparison({ container: {} as HTMLElement, renderer, palette: getPalette('b'), height: 3.29 });
  sample.dispose(); release();
  await expect(sample.whenReady()).rejects.toThrow('disposed');
  for (const actor of actors) expect(actor.dispose).toHaveBeenCalledTimes(1);
  expect(renderer.dispose).not.toHaveBeenCalled();
});

it('measures the actual GLTF body and thirty-citizen overlap for each proposed scale', async () => {
  const { readFile } = await import('node:fs/promises');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
  const { createAssetSource } = await import('../../src/client/town/assets/source.ts');
  const actual = await vi.importActual<typeof import('../../src/client/town/assets/character.ts')>('../../src/client/town/assets/character.ts');
  const loader = new GLTFLoader();
  // Textures do not affect vertex bounds; avoid browser image decoding in this CPU measurement.
  loader.register(() => ({ name: 'test_texture', loadTexture: async () => new THREE.Texture() }));
  const bytes = await readFile(new URL('../../public/models/characters/kenney-mini/character-male-a.glb', import.meta.url));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.animations = gltf.animations;
  vi.mocked(createSampleCharacter).mockImplementation(actual.createSampleCharacter);
  vi.mocked(createAssetSource).mockImplementation(() => ({ loadGltf: async () => clone(gltf.scene) as THREE.Group, dispose: vi.fn() }));
  const rows = [];
  for (const height of [3.29, 2.4, 1.8, 1.5]) {
    const renderer = { domElement: {}, shadowMap: { enabled: false, type: 0 }, render: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
    const sample = createCrowdComparison({ container: {} as HTMLElement, renderer, palette: getPalette('b'), height });
    const ready = await sample.whenReady(); sample.setTime(0);
    expect(ready.instances).toBe(30);
    expect(ready.metrics.bodySize.height).toBeCloseTo(height, 4);
    expect(ready.metrics.idleBodyEnvelope.width).toBeLessThan(ready.metrics.bodySize.width * 1.2);
    expect(ready.metrics.idleBodyEnvelope.height).toBeLessThan(height * 1.1);
    rows.push(ready.metrics); sample.dispose();
  }
  expect(rows[0]!.bodyOverlapPairs).toBeGreaterThan(0);
  expect(rows.at(-1)!.bodyOverlapPairs).toBe(0);
  expect(rows.at(-1)!.bodyOutsideClearance).toBe(0);
  expect(rows.at(-1)!.idleEnvelopeVisibleOverlapPairs).toBe(0);
  expect(rows.at(-1)!.idleEnvelopeVisibleOutsideClearance).toBe(0);
  gltf.scene.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      for (const mat of Array.isArray(child.material) ? child.material : [child.material]) mat.dispose();
    }
  });
}, 15_000);
