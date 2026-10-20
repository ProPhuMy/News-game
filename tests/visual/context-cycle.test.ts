/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { cycleContext, type ContextCycleTarget } from '../../src/client/visual-test/context-cycle.ts';

/** Mimics the real town's context-loss handler: hide the canvas, clear bubbles, show the fallback, and undo it on restore. */
function fakeTown(options: { clearBubbles?: boolean; showFallback?: boolean; fireRestore?: boolean } = {}) {
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const overlay = document.createElement('div');
  for (let i = 0; i < 3; i++) overlay.appendChild(Object.assign(document.createElement('div'), { className: 'speech-bubble' }));
  container.appendChild(overlay);
  let fallback: HTMLElement | null = null;
  // Like Chromium: a restore is honored only from a later task than the lost event (not from its microtasks).
  let restoreAllowed = false;
  canvas.addEventListener('webglcontextlost', () => {
    setTimeout(() => { restoreAllowed = true; }, 0);
    canvas.style.display = 'none';
    if (options.clearBubbles !== false) overlay.replaceChildren();
    if (options.showFallback !== false) {
      fallback = Object.assign(document.createElement('div'), { className: 'town-fallback-container' });
      fallback.setAttribute('role', 'status');
      container.appendChild(fallback);
    }
  });
  canvas.addEventListener('webglcontextrestored', () => {
    fallback?.remove();
    fallback = null;
    canvas.style.display = 'block';
  });
  const advance = vi.fn();
  const target: ContextCycleTarget = {
    canvas, container, advance,
    view: { isWebGLSupported: () => fallback === null, whenReady: async () => ({ degraded: [] }) },
    lose: () => {
      setTimeout(() => canvas.dispatchEvent(new Event('webglcontextlost')), 0);
    },
    restore: () => {
      if (!restoreAllowed || options.fireRestore === false) return;
      setTimeout(() => canvas.dispatchEvent(new Event('webglcontextrestored')), 0);
    },
  };
  return { target, advance };
}

describe('cycleContext', () => {
  it('loses the context, checks the fallback and cleared bubbles, restores, then advances one restore interval', async () => {
    const { target, advance } = fakeTown();
    await expect(cycleContext(target, { restoreMs: 100, eventTimeoutMs: 1000 })).resolves.toEqual({
      lost: true, fallbackShown: true, canvasHidden: true, bubblesBefore: 3, bubblesAfterLoss: 0, restored: true, restoreMs: 100,
    });
    expect(advance).toHaveBeenCalledWith(100);
  });

  it('fails when the fallback never appears after the loss', async () => {
    const { target } = fakeTown({ showFallback: false });
    await expect(cycleContext(target, { restoreMs: 100, eventTimeoutMs: 1000 })).rejects.toThrow(/context-cycle: after loss the fallback/);
  });

  it('fails when bubbles stay on screen over the fallback', async () => {
    const { target } = fakeTown({ clearBubbles: false });
    await expect(cycleContext(target, { restoreMs: 100, eventTimeoutMs: 1000 })).rejects.toThrow(/context-cycle: 3 speech bubbles stayed/);
  });

  it('fails with a clear message when the context is never restored', async () => {
    const { target, advance } = fakeTown({ fireRestore: false });
    await expect(cycleContext(target, { restoreMs: 100, eventTimeoutMs: 50 })).rejects.toThrow(/context-cycle: no webglcontextrestored event within 50 ms/);
    expect(advance).not.toHaveBeenCalled();
  });
});
