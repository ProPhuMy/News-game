import honest from '../../src/sim/fixtures/solo-honest.json';
import { FixtureSchema } from '../../src/shared/fixture.ts';
import { LOCATIONS } from '../../src/shared/ids.ts';
import type { SceneReadiness } from '../../src/client/visuals/town-types.ts';
// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createTownView } from '../../src/client/town/index.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createSampleCharacter } from '../../src/client/town/assets/character.ts';
import { createAssetSource } from '../../src/client/town/assets/source.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';

vi.mock('../../src/client/town/buildings.ts', () => ({ createTownBuildings: vi.fn() }));
vi.mock('../../src/client/town/assets/character.ts', () => ({ createSampleCharacter: vi.fn() }));
vi.mock('../../src/client/town/assets/source.ts', () => ({ createAssetSource: vi.fn() }));
function setup(architectureReady?: Promise<SceneReadiness>) {
  const assetDispose = vi.fn();
  vi.mocked(createAssetSource).mockReturnValue({ loadGltf: vi.fn(), dispose: assetDispose });
  const pieceDispose = vi.fn();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const buildingGroup = new THREE.Group();
  const outlineMaterial = new THREE.LineBasicMaterial();
  for (let i = 0; i < 2; i++) {
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry()), outlineMaterial);
    line.name = 'toon-outline'; buildingGroup.add(line);
  }
  vi.mocked(createTownBuildings).mockReturnValue({
    group: buildingGroup, ready: architectureReady ?? gate.then(() => ({ degraded: ['tree: stand-in'] })), dispose: pieceDispose,
    getLocationAnchor: () => new THREE.Vector3(), getOfficeAnchor: () => new THREE.Vector3(),
    getOfficeBannerColor: () => 0, setOfficeHighlight: vi.fn(), syncOffices: vi.fn(),
  });
  const actors: { object: THREE.Group; setPaper: ReturnType<typeof vi.fn>; setPose: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
  vi.mocked(createSampleCharacter).mockImplementation(async () => {
    await gate;
    let disposed = false;
    const assertLive = () => { if (disposed) throw new Error('character disposed'); };
    const actor = { object: new THREE.Group(), setPaper: vi.fn(assertLive), setPose: vi.fn(assertLive), dispose: vi.fn(() => { disposed = true; }) };
    actors.push(actor); return actor;
  });
  const renderer = { domElement: document.createElement('canvas'), shadowMap: { enabled: false, type: 0 },
    render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
  const container = document.createElement('div');
  const view = createTownView({ container, forceWebGL: true, customRenderer: renderer, palette: getPalette('c') });
  return { view, actors, release, pieceDispose, assetDispose, renderer, container, buildingGroup };
}

describe('TownView readiness', () => {
  it('batches static outlines after assets are ready and frees its geometry before architecture', async () => {
    const { view, release, buildingGroup, pieceDispose } = setup();
    expect(buildingGroup.getObjectByName('static-outline-batch')).toBeUndefined();
    release(); await view.whenReady();
    const batch = buildingGroup.getObjectByName('static-outline-batch');
    expect(batch).toBeInstanceOf(THREE.LineSegments);
    if (!(batch instanceof THREE.LineSegments)) throw new Error('missing static batch');
    const dispose = vi.spyOn(batch.geometry, 'dispose');
    view.dispose(); view.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(pieceDispose.mock.invocationCallOrder[0]!);
    expect(buildingGroup.children.every(child => child.visible)).toBe(true);
  });

  it('waits for architecture and all rigs and surfaces degraded pieces', async () => {
    const { view, release, actors, renderer } = setup();
    let ready = false; void view.whenReady().then(() => { ready = true; });
    await Promise.resolve(); expect(ready).toBe(false);
    expect(createTownBuildings).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ palette: getPalette('c') }));
    release(); await expect(view.whenReady()).resolves.toEqual({ degraded: ['tree: stand-in'] });
    expect(actors).toHaveLength(34);
    view.dispose();
    expect(renderer.dispose).not.toHaveBeenCalled();
  });

  it('disposes pieces before cached assets, including late rigs', async () => {
    const { view, release, actors, pieceDispose, assetDispose } = setup();
    view.dispose(); view.dispose(); release();
    await expect(view.whenReady()).rejects.toThrow('disposed');
    expect(pieceDispose).toHaveBeenCalledTimes(1);
    expect(assetDispose).toHaveBeenCalledTimes(1);
    expect(pieceDispose.mock.invocationCallOrder[0]).toBeLessThan(assetDispose.mock.invocationCallOrder[0]!);
    for (const actor of actors) expect(actor.dispose).toHaveBeenCalledTimes(1);
  });

  it('exposes fallback readiness without requiring WebGL', async () => {
    const view = createTownView({ container: document.createElement('div') });
    expect(view.isWebGLSupported()).toBe(false);
    await expect(view.whenReady()).resolves.toEqual({ degraded: [] });
    view.dispose();
  });
});


it('keeps fallback callbacks inert after required initialization fails with attached actors', async () => {
  let reject!: (error: Error) => void;
  const architectureReady = new Promise<SceneReadiness>((_, fail) => { reject = fail; });
  const { view, release, actors, container, renderer } = setup(architectureReady);
  release();
  await vi.waitFor(() => expect(actors).toHaveLength(34));
  reject(new Error('required asset failed'));
  await expect(view.whenReady()).rejects.toThrow('required asset failed');
  expect(container.querySelector('.town-fallback-container')).not.toBeNull();
  const calls = actors.map(actor => [actor.setPaper.mock.calls.length, actor.setPose.mock.calls.length]);
  const snapshot = FixtureSchema.parse(honest).frames.find(frame => frame.public.reactionPlan)!.public;
  expect(() => view.syncFromSnapshot(snapshot)).not.toThrow();
  expect(() => view.setReducedMotion(true)).not.toThrow();
  expect(() => view.setTargetLocation(LOCATIONS[0])).not.toThrow();
  expect(() => view.setPhase('intro')).not.toThrow();
  const resizes = vi.mocked(renderer.setSize).mock.calls.length;
  expect(() => view.resize()).not.toThrow();
  expect(vi.mocked(renderer.setSize).mock.calls.length).toBe(resizes);
  await expect(view.playReactionPlan(snapshot.reactionPlan!, 20)).resolves.toBeUndefined();
  expect(actors.map(actor => [actor.setPaper.mock.calls.length, actor.setPose.mock.calls.length])).toEqual(calls);
  expect(view.isWebGLSupported()).toBe(false);
  expect(container.querySelector('.town-fallback-container')).not.toBeNull();
  view.dispose(); view.dispose();
  for (const actor of actors) expect(actor.dispose).toHaveBeenCalledTimes(1);
});
