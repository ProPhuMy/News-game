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
function setup() {
  const assetDispose = vi.fn();
  vi.mocked(createAssetSource).mockReturnValue({ loadGltf: vi.fn(), dispose: assetDispose });
  const pieceDispose = vi.fn();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  vi.mocked(createTownBuildings).mockReturnValue({
    group: new THREE.Group(), ready: gate.then(() => ({ degraded: ['tree: stand-in'] })), dispose: pieceDispose,
    getLocationAnchor: () => new THREE.Vector3(), getOfficeAnchor: () => new THREE.Vector3(),
    getOfficeBannerColor: () => 0, setOfficeHighlight: vi.fn(), syncOffices: vi.fn(),
  });
  const actors: { object: THREE.Group; setPaper: ReturnType<typeof vi.fn>; setPose: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
  vi.mocked(createSampleCharacter).mockImplementation(async () => {
    await gate;
    const actor = { object: new THREE.Group(), setPaper: vi.fn(), setPose: vi.fn(), dispose: vi.fn() };
    actors.push(actor); return actor;
  });
  const renderer = { domElement: document.createElement('canvas'), shadowMap: { enabled: false, type: 0 },
    render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
  const container = document.createElement('div');
  const view = createTownView({ container, forceWebGL: true, customRenderer: renderer, palette: getPalette('c') });
  return { view, actors, release, pieceDispose, assetDispose, renderer, container };
}

describe('TownView readiness', () => {
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
