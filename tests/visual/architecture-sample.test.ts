/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { runRenderingSample, type RenderingSampleModule } from '../../src/client/visual-test/architecture-sample.ts';
import { parseArchitectureScenario } from '../../src/client/visual-test/architecture-scenario.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';
import type { SceneReadiness } from '../../src/client/visuals/town-types.ts';

vi.mock('../../src/client/visual-test/pixels.ts', async (original) => ({
  ...(await original<typeof import('../../src/client/visual-test/pixels.ts')>()),
  measureCanvas: () => ({ width: 1280, height: 720, distinctColors: 500 }),
}));

const renderer = { domElement: document.createElement('canvas') } as unknown as THREE.WebGLRenderer;

function fakeModule(ready: Promise<SceneReadiness>) {
  const calls: string[] = [];
  const setTime = vi.fn((ms: number) => { calls.push(`setTime:${ms}`); });
  const create = vi.fn(() => ({
    whenReady: () => ready.then((r) => { calls.push('ready'); return r; }),
    setTime,
    dispose: vi.fn(),
  }));
  const module: RenderingSampleModule = { createRenderingSample: create };
  return { module, create, setTime, calls };
}

const run = (module: RenderingSampleModule, search = '?reactionMs=1000') =>
  runRenderingSample(module, parseArchitectureScenario(search), document.createElement('div'), renderer);

describe('runRenderingSample', () => {
  it('awaits readiness, then sets the exact time', async () => {
    const fake = fakeModule(Promise.resolve({ degraded: [] }));
    await run(fake.module);
    expect(fake.calls).toEqual(['ready', 'setTime:1000']);
  });

  it('reaction time 0 still sets time', async () => {
    const fake = fakeModule(Promise.resolve({ degraded: [] }));
    await run(fake.module, '?reactionMs=0');
    expect(fake.setTime).toHaveBeenCalledWith(0);
  });

  it('degraded fails the capture', async () => {
    const fake = fakeModule(Promise.resolve({ degraded: ['x'] }));
    await expect(run(fake.module)).resolves.toEqual({ status: 'error', error: 'degraded-assets: x' });
    expect(fake.setTime).not.toHaveBeenCalled();
  });

  it('rejected readiness fails with its message', async () => {
    const fake = fakeModule(Promise.reject(new Error('rig missing head bone')));
    await expect(run(fake.module)).resolves.toEqual({ status: 'error', error: 'rig missing head bone' });
  });

  it('passes palette, variant, view and reducedMotion through', async () => {
    const fake = fakeModule(Promise.resolve({ degraded: [] }));
    await run(fake.module, '?variant=hybrid-original&view=awning&palette=b&reducedMotion=true');
    expect(fake.create).toHaveBeenCalledWith(expect.objectContaining({
      renderer, palette: getPalette('b'), variant: 'hybrid-original', view: 'awning', reducedMotion: true,
    }));
  });

  it('publishes renderer sample', async () => {
    const fake = fakeModule(Promise.resolve({ degraded: [] }));
    await expect(run(fake.module)).resolves.toMatchObject({ status: 'ready', scene: 'architecture', renderer: 'sample', distinctColors: 500 });
  });
});
