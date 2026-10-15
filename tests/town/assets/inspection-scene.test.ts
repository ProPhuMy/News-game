import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createInspectionScene } from '../../../src/client/town/assets/inspection-scene.ts';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

afterEach(() => vi.restoreAllMocks());
function setup() {
  const render = vi.fn();
  const renderer = { render, setSize: vi.fn(), setPixelRatio: vi.fn() } as unknown as THREE.WebGLRenderer;
  const options = { container: { clientWidth: 800, clientHeight: 600 } as HTMLElement,
    renderer, modelUrl: '/models/characters/kenney-mini/character-male-a.glb', clip: 'walk' };
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial();
  const head = new THREE.Bone(); head.name = 'head'; head.position.y = 1;
  scene.add(new THREE.Mesh(geometry, material), head);
  const animations = [new THREE.AnimationClip('walk', 1, [
    new THREE.NumberKeyframeTrack('head.position[x]', [0, 1], [0, 2]),
  ])];
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene, animations } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);
  return { options, render, scene, geometry, material, head };
}

describe('character inspection scene', () => {
  it('waits for assets, then poses exact clip time reproducibly without a frame loop', async () => {
    const { options, render, head } = setup();
    const view = createInspectionScene(options);
    expect(await view.whenReady()).toEqual({ degraded: [], clips: ['walk'], instances: 1 });
    view.setTime(250); const position = head.position.x;
    expect(position).toBeCloseTo(0.5);
    view.setTime(750); expect(head.position.x).toBeCloseTo(1.5);
    view.setTime(250); expect(head.position.x).toBeCloseTo(position);
    expect(render).toHaveBeenCalledTimes(3);
    view.dispose();
  });
  it('rejects missing models and unknown clips instead of certifying stand-ins', async () => {
    const { options } = setup();
    const unknown = createInspectionScene({ ...options, clip: 'not-a-clip' });
    await expect(unknown.whenReady()).rejects.toThrow('unknown clip'); unknown.dispose();
    vi.mocked(GLTFLoader.prototype.loadAsync).mockRejectedValue(new Error('missing model'));
    const missing = createInspectionScene(options);
    await expect(missing.whenReady()).rejects.toThrow('missing model'); missing.dispose();
  });
  it('disposes model resources once and rejects unsafe inputs', async () => {
    const { options, geometry, material } = setup();
    const disposeGeometry = vi.spyOn(geometry, 'dispose'); const disposeMaterial = vi.spyOn(material, 'dispose');
    const view = createInspectionScene({ ...options, clip: null });
    await view.whenReady(); view.setTime(0);
    expect(() => view.setTime(-1)).toThrow();
    view.dispose(); view.dispose();
    expect(disposeGeometry).toHaveBeenCalledTimes(1); expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(() => createInspectionScene({ ...options, modelUrl: 'https://external.test/file.glb' })).toThrow();
    expect(() => createInspectionScene({ ...options, modelUrl: '/models/characters/../secret.glb' })).toThrow();
  });
});


describe('inspection count and framing', () => {
  it('draws thirty independently posed instances and reports the actual count', async () => {
    const { options, render } = setup();
    const view = createInspectionScene({ ...options, count: 30 });
    expect((await view.whenReady()).instances).toBe(30);
    view.setTime(250);
    const scene = render.mock.calls[0]![0] as THREE.Scene;
    const heads: THREE.Object3D[] = [];
    scene.traverse(object => { if (object.name === 'head') heads.push(object); });
    expect(heads).toHaveLength(30);
    expect(new Set(heads).size).toBe(30);
    expect(heads.every(head => Math.abs(head.position.x - 0.5) < 0.001)).toBe(true);
    view.dispose();
  });

  it('fits animated geometry and the attached hat inside the camera at narrow and wide sizes', async () => {
    for (const [width, height] of [[1280, 720], [390, 844]]) {
      const { options, render } = setup();
      const view = createInspectionScene({ ...options, container: { clientWidth: width, clientHeight: height } as HTMLElement });
      await view.whenReady(); view.setTime(750);
      const [scene, camera] = render.mock.calls[0]! as [THREE.Scene, THREE.Camera];
      const bounds = new THREE.Box3().setFromObject(scene, true);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const ndc = new THREE.Vector3(x, y, z).project(camera);
        expect(Math.abs(ndc.x)).toBeLessThan(0.95);
        expect(Math.abs(ndc.y)).toBeLessThan(0.95);
        expect(ndc.z).toBeGreaterThan(-1); expect(ndc.z).toBeLessThan(1);
      }
      view.dispose();
    }
  });

  it('rejects counts outside integer 1–30', () => {
    const { options } = setup();
    for (const count of [0, -1, 31, 1.5, NaN, Infinity]) {
      expect(() => createInspectionScene({ ...options, count })).toThrow('count');
    }
  });
});
