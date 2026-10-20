// --context-cycle (D2): loses and restores the real WebGL context of a ready town, checking what the town shows in
// between, then advances the virtual clock so the restored canvas draws again. Codex owns the town's handlers.
import type { SceneReadiness } from './settle.ts';

export interface ContextCycleTarget {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  view: { isWebGLSupported(): boolean; whenReady?: () => Promise<SceneReadiness> };
  /** WEBGL_lose_context.loseContext / restoreContext on the real renderer's context. */
  lose(): void;
  restore(): void;
  advance(ms: number): void;
}

export interface ContextCycleReport {
  lost: true;
  fallbackShown: true;
  canvasHidden: true;
  bubblesBefore: number;
  bubblesAfterLoss: 0;
  restored: true;
  /** Virtual time advanced after the restore, so at least one frame draws on the restored context. */
  restoreMs: number;
}

const FALLBACK = '.town-fallback-container[role="status"]';
const BUBBLE = '.speech-bubble';

/** Resolves on the next `type` event on target; rejects after timeoutMs of real time. */
function nextEvent(target: EventTarget, type: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(type, onEvent);
      reject(new Error(`context-cycle: no ${type} event within ${timeoutMs} ms`));
    }, timeoutMs);
    function onEvent(): void {
      clearTimeout(timer);
      resolve();
    }
    target.addEventListener(type, onEvent, { once: true });
  });
}

export async function cycleContext(
  target: ContextCycleTarget,
  options: { restoreMs: number; eventTimeoutMs: number },
): Promise<ContextCycleReport> {
  const { canvas, container, view } = target;
  const bubblesBefore = container.querySelectorAll(BUBBLE).length;

  const lost = nextEvent(canvas, 'webglcontextlost', options.eventTimeoutMs);
  target.lose();
  await lost;
  // Chromium ignores restoreContext() until the lost event's dispatch has finished, so wait for a later task.
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (view.isWebGLSupported() || !container.querySelector(FALLBACK)) {
    throw new Error(`context-cycle: after loss the fallback (${FALLBACK}) is not shown`);
  }
  if (canvas.style.display !== 'none') throw new Error('context-cycle: after loss the canvas is still displayed');
  const bubblesAfterLoss = container.querySelectorAll(BUBBLE).length;
  if (bubblesAfterLoss !== 0) throw new Error(`context-cycle: ${bubblesAfterLoss} speech bubbles stayed over the fallback`);

  const restored = nextEvent(canvas, 'webglcontextrestored', options.eventTimeoutMs);
  target.restore();
  await restored;
  if (!view.isWebGLSupported() || container.querySelector(FALLBACK)) {
    throw new Error('context-cycle: after restore the fallback is still shown');
  }
  if (canvas.style.display === 'none') throw new Error('context-cycle: after restore the canvas is still hidden');
  const readiness = view.whenReady ? await view.whenReady() : { degraded: [] };
  if (readiness.degraded.length > 0) throw new Error(`context-cycle: degraded after restore: ${readiness.degraded.join('; ')}`);
  target.advance(options.restoreMs);

  return {
    lost: true, fallbackShown: true, canvasHidden: true, bubblesBefore, bubblesAfterLoss: 0, restored: true,
    restoreMs: options.restoreMs,
  };
}
