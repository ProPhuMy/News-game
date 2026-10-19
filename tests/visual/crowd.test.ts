/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { parseCrowdScenario, runCrowdScene, type CrowdModule } from '../../src/client/visual-test/crowd.ts';

vi.mock('../../src/client/visual-test/pixels.ts', async (original) => ({
  ...(await original<typeof import('../../src/client/visual-test/pixels.ts')>()),
  measureCanvas: () => ({ width: 1280, height: 720, distinctColors: 500 }),
}));

const renderer = { domElement: document.createElement('canvas') } as unknown as THREE.WebGLRenderer;
const metrics = { height: 3.29 } as never;

function fake(report: { degraded: string[]; instances: number }) {
  const calls: string[] = [];
  const dispose = vi.fn(() => { calls.push('dispose'); });
  const create = vi.fn(() => ({
    whenReady: async () => ({ ...report, metrics }),
    setTime: (ms: number) => { calls.push(`setTime:${ms}`); },
    dispose,
  }));
  const module: CrowdModule = { createCrowdComparison: create };
  return { module, create, calls, dispose };
}

const run = (module: CrowdModule, search = '?scene=crowd&height=3.29&reactionMs=0&palette=b') =>
  runCrowdScene(module, parseCrowdScenario(search), document.createElement('div'), renderer);

describe('parseCrowdScenario', () => {
  it('reads height, palette, reactionMs and seed', () => {
    expect(parseCrowdScenario('?height=3.29&palette=a&reactionMs=5&seed=2')).toEqual({ citizenHeight: 3.29, palette: 'a', reactionMs: 5, seed: 2 });
    expect(() => parseCrowdScenario('?height=9')).toThrow(/height must be a number between 0.5 and 6/);
    expect(() => parseCrowdScenario('')).toThrow(/height is required/);
  });
});

describe('runCrowdScene', () => {
  it('measures at the exact time, publishes instances and metrics, then disposes', async () => {
    const f = fake({ degraded: [], instances: 30 });
    await expect(run(f.module)).resolves.toMatchObject({
      status: 'ready', scene: 'crowd', citizenHeight: 3.29, palette: 'b', instances: 30, metrics, distinctColors: 500,
    });
    expect(f.calls).toEqual(['setTime:0', 'dispose']);
    expect(f.create).toHaveBeenCalledWith(expect.objectContaining({ height: 3.29 }));
  });

  it('fails with count-mismatch when the scene reports 29', async () => {
    const f = fake({ degraded: [], instances: 29 });
    await expect(run(f.module)).resolves.toEqual({ status: 'error', error: 'count-mismatch: requested 30 citizens, scene reports 29' });
    expect(f.dispose).toHaveBeenCalled();
  });

  it('degraded assets fail the capture', async () => {
    const f = fake({ degraded: ['x'], instances: 30 });
    await expect(run(f.module)).resolves.toEqual({ status: 'error', error: 'degraded-assets: x' });
  });

  it('a readiness rejection is an error', async () => {
    const module: CrowdModule = { createCrowdComparison: () => ({ whenReady: () => Promise.reject(new Error('boom')), setTime() {}, dispose() {} }) };
    await expect(run(module)).resolves.toEqual({ status: 'error', error: 'boom' });
  });
});
