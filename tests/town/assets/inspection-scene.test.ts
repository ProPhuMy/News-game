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
    expect(await view.whenReady()).toEqual({ degraded: [], clips: ['walk'] });
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
