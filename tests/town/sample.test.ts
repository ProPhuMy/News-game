import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getPalette } from '../../src/client/visuals/palette.ts';
import { createRenderingSample } from '../../src/client/town/sample.ts';

afterEach(() => vi.restoreAllMocks());
function asset(url: string) {
  const scene = new THREE.Group();
  const material = new THREE.MeshStandardMaterial(); material.name = 'leafsGreen';
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.3), material));
  for (const name of ['head', 'arm-left', 'arm-right']) {
    const bone = new THREE.Bone(); bone.name = name; scene.add(bone);
  }
  const animations = url.includes('/characters/') ? ['idle', 'walk', 'sprint'].map(name =>
    new THREE.AnimationClip(name, 1, [new THREE.NumberKeyframeTrack('head.position[x]', [0, 1], [0, 0.2])])) : [];
  return { scene, animations } as Awaited<ReturnType<GLTFLoader['loadAsync']>>;
}
function setup() {
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async url => asset(url));
  const render = vi.fn(); const dispose = vi.fn();
  const canvas = { remove: vi.fn() };
  const renderer = { render, dispose, domElement: canvas, shadowMap: {}, setSize: vi.fn() } as unknown as THREE.WebGLRenderer;
  const options = { container: { clientWidth: 1280, clientHeight: 720 } as HTMLElement, renderer,
    palette: getPalette('a'), variant: 'code' as const, view: 'street' as const };
  return { options, render, dispose, canvas };
}

describe('integrated rendering sample', () => {
  it('awaits every asset, renders exact time reproducibly and keeps the borrowed renderer alive', async () => {
    const { options, render, dispose, canvas } = setup();
    const sample = createRenderingSample(options);
    expect(() => sample.setTime(0)).toThrow('ready');
    await expect(sample.whenReady()).resolves.toEqual({ degraded: [] });
    expect(render).not.toHaveBeenCalled();
    sample.setTime(250);
    const scene = render.mock.calls[0]![0] as THREE.Scene;
    const actors = scene.children.filter(child => child.name === 'sample-citizen');
    expect(actors).toHaveLength(5);
    const head = actors[1]!.getObjectByName('head')!;
    const pose = head.position.clone();
    sample.setTime(500); expect(head.position.equals(pose)).toBe(false);
    sample.setTime(250); expect(head.position.equals(pose)).toBe(true);
    expect(render).toHaveBeenCalledTimes(3);
    expect(() => sample.setTime(NaN)).toThrow('time');
    const sun = scene.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    expect(sun.castShadow).toBe(true); expect(options.renderer.shadowMap.enabled).toBe(true);
    sample.dispose(); sample.dispose();
    expect(dispose).not.toHaveBeenCalled(); expect(canvas.remove).not.toHaveBeenCalled();
    expect(scene.children).toHaveLength(0);
    expect(() => sample.setTime(0)).toThrow('disposed');
  });

  it('holds reduced-motion poses stable across timestamps', async () => {
    const { options, render } = setup();
    const sample = createRenderingSample({ ...options, reducedMotion: true });
    await sample.whenReady(); sample.setTime(250);
    const scene = render.mock.calls[0]![0] as THREE.Scene;
    const head = scene.children.find(child => child.name === 'sample-citizen')!.getObjectByName('head')!;
    const pose = head.position.clone(); sample.setTime(750);
    expect(head.position.equals(pose)).toBe(true); sample.dispose();
  });

  it('forwards prop degradation instead of certifying a stand-in', async () => {
    const { options } = setup();
    vi.mocked(GLTFLoader.prototype.loadAsync).mockImplementation(async url => {
      if (url.includes('/props/')) throw new Error('missing foliage');
      return asset(url);
    });
    const sample = createRenderingSample(options);
    const readiness = await sample.whenReady();
    expect(readiness.degraded.length).toBeGreaterThan(0);
    expect(readiness.degraded.join(' ')).toContain('missing foliage'); sample.dispose();
  });


  it('rejects a missing character clip instead of falling back silently', async () => {
    const { options } = setup();
    vi.mocked(GLTFLoader.prototype.loadAsync).mockImplementation(async url => {
      const loaded = asset(url); loaded.animations = []; return loaded;
    });
    const sample = createRenderingSample(options);
    await expect(sample.whenReady()).rejects.toThrow('missing clip: idle'); sample.dispose();
  });

  it('rejects failed characters and releases late loads after disposal', async () => {
    const { options, render } = setup();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const releases: ReturnType<typeof vi.spyOn>[] = [];
    vi.mocked(GLTFLoader.prototype.loadAsync).mockImplementation(async url => {
      await gate; const loaded = asset(url);
      const mesh = loaded.scene.children[0] as THREE.Mesh;
      releases.push(vi.spyOn(mesh.geometry, 'dispose')); return loaded;
    });
    const sample = createRenderingSample(options);
    const pending = sample.whenReady(); sample.dispose(); release();
    await expect(pending).rejects.toThrow('disposed');
    expect(render).not.toHaveBeenCalled();
    expect(releases.length).toBeGreaterThan(0);
    for (const releaseGeometry of releases) expect(releaseGeometry).toHaveBeenCalledTimes(1);
  });
});
