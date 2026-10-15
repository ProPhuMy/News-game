import { describe, expect, it } from 'vitest';
import { settleScene } from '../../src/client/visual-test/settle.ts';

function recorder() {
  const events: string[] = [];
  return {
    events,
    advance: (ms: number) => { events.push(`advance ${ms}`); },
  };
}

describe('settleScene', () => {
  it('advances exactly the requested time when the view has no readiness hook', async () => {
    const r = recorder();
    await expect(settleScene({}, r.advance, 6000)).resolves.toEqual({ degraded: [] });
    expect(r.events).toEqual(['advance 6000']);
  });

  it('waits for assets before advancing to the exact timestamp', async () => {
    const r = recorder();
    const view = {
      whenReady: async () => {
        r.events.push('ready');
        return { degraded: [] };
      },
    };
    await settleScene(view, r.advance, 1500);
    expect(r.events).toEqual(['ready', 'advance 1500']);
  });

  it('reports degraded asset fallbacks instead of hiding them', async () => {
    const r = recorder();
    const view = { whenReady: async () => ({ degraded: ['bakery: models/buildings/bakery.glb failed to load'] }) };
    await expect(settleScene(view, r.advance, 100)).resolves.toEqual({
      degraded: ['bakery: models/buildings/bakery.glb failed to load'],
    });
  });

  it('propagates unrecoverable initialization failures without advancing time', async () => {
    const r = recorder();
    const view = { whenReady: () => Promise.reject(new Error('character rig missing')) };
    await expect(settleScene(view, r.advance, 100)).rejects.toThrow('character rig missing');
    expect(r.events).toEqual([]);
  });
});
