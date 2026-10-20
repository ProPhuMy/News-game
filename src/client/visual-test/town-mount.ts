import * as THREE from 'three';
import type { ClientStore } from '../net/store.ts';
import { createTownView, mountTown, type MountTownOptions, type TownView, type TownViewOptions } from '../town/index.ts';
import { getPalette, type PaletteId } from '../visuals/palette.ts';
import type { VirtualClock } from './clock.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import { cycleContext, type ContextCycleReport } from './context-cycle.ts';
import { settleScene, type SceneReadiness } from './settle.ts';
import type { TownFrame } from './state.ts';

export type TownCapture =
  | ({ status: 'ready' } & TownFrame)
  | { status: 'error'; error: string };

/** Virtual time after a context restore: a few frames, so the restored canvas is redrawn before measuring. */
const CONTEXT_RESTORE_MS = 100;

export interface FactoryRecord { view: TownView | null; palette: PaletteId | null }

/** A view factory that records the view and the palette id the town actually handed it. */
export function recordingFactory(
  record: FactoryRecord,
  create: (options: TownViewOptions & { container: HTMLElement }) => TownView = createTownView,
): (options: TownViewOptions & { container: HTMLElement }) => TownView {
  return (options) => {
    record.palette = options.palette?.id ?? null;
    record.view = create(options);
    return record.view;
  };
}

/** The options handed to mountTown: the scenario's palette must reach the real town. */
export function townMountOptions(
  scenario: { reducedMotion: boolean; palette: PaletteId },
  renderer: THREE.WebGLRenderer | null,
  viewFactory: NonNullable<MountTownOptions['viewFactory']>,
): MountTownOptions {
  return { ...(renderer ? { customRenderer: renderer } : {}), reducedMotion: scenario.reducedMotion, palette: getPalette(scenario.palette), viewFactory };
}

/** For --no-webgl: null when the town really fell back, else why the capture would not show the fallback. */
export function verifyFallback(view: TownView, container: HTMLElement): string | null {
  if (view.isWebGLSupported()) return 'no-webgl: the town reports WebGL support; the browser was not started without WebGL';
  if (!container.querySelector('.town-fallback-container[role="status"]')) {
    return 'no-webgl: the town has no WebGL but the fallback element (.town-fallback-container[role="status"]) is missing';
  }
  return null;
}

/**
 * Mounts the real town over the store, waits for its assets, advances the virtual clock by exactly
 * reactionMs, and measures the canvas. Shared by the town and UI harness pages.
 */
export async function mountAndSettleTown(
  container: HTMLElement,
  store: ClientStore,
  clock: VirtualClock,
  scenario: { reducedMotion: boolean; reactionMs: number; palette: PaletteId; noWebgl?: boolean; contextCycle?: boolean },
): Promise<TownCapture> {
  if (scenario.noWebgl) return mountFallbackTown(container, store, clock, scenario);
  let renderer: THREE.WebGLRenderer;
  try {
    // Same settings as src/client/town/scene.ts, plus preserveDrawingBuffer so the frame can be measured.
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
  } catch {
    return { status: 'error', error: 'webgl-unavailable' };
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.cssText = 'width: 100%; height: 100%; display: block;';

  const holder: FactoryRecord = { view: null, palette: null };
  mountTown(container, store, townMountOptions(scenario, renderer, recordingFactory(holder)));
  const view = holder.view;
  if (!view) throw new Error('mountTown did not create a view');
  if (holder.palette === null) return { status: 'error', error: 'town view factory received no palette' };

  // Readiness hook from the presentation interface note §5; absent until Codex adds async assets.
  // Assets load first, then time advances to the exact requested timestamp.
  const readiness = await settleScene(
    view as TownView & { whenReady?: () => Promise<SceneReadiness> },
    (ms) => clock.advance(ms),
    scenario.reactionMs,
  );
  if (readiness.degraded.length > 0) return { status: 'error', error: `degraded-assets: ${readiness.degraded.join('; ')}` };

  let contextCycle: ContextCycleReport | undefined;
  if (scenario.contextCycle) {
    const loseContext = renderer.getContext().getExtension('WEBGL_lose_context');
    if (!loseContext) return { status: 'error', error: 'context-cycle: WEBGL_lose_context is unavailable' };
    try {
      contextCycle = await cycleContext({
        canvas: renderer.domElement, container, view,
        lose: () => loseContext.loseContext(), restore: () => loseContext.restoreContext(), advance: (ms) => clock.advance(ms),
      }, { restoreMs: CONTEXT_RESTORE_MS, eventTimeoutMs: 10_000 });
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }

  const stats = measureCanvas(renderer.domElement);
  const verdict = readyVerdict({ webgl: view.isWebGLSupported(), distinctColors: stats.distinctColors });
  if (verdict.status !== 'ready') return verdict;
  return { status: 'ready', renderer: 'webgl', webgl: true, palette: holder.palette, ...stats, ...(contextCycle ? { contextCycle } : {}) };
}

/** Same mount minus the renderer: the town must pick its own no-WebGL fallback. */
async function mountFallbackTown(
  container: HTMLElement,
  store: ClientStore,
  clock: VirtualClock,
  scenario: { reducedMotion: boolean; reactionMs: number; palette: PaletteId },
): Promise<TownCapture> {
  const holder: FactoryRecord = { view: null, palette: null };
  mountTown(container, store, townMountOptions(scenario, null, recordingFactory(holder)));
  const view = holder.view;
  if (!view) throw new Error('mountTown did not create a view');
  const failure = verifyFallback(view, container);
  if (failure) return { status: 'error', error: failure };
  await settleScene(view as TownView & { whenReady?: () => Promise<SceneReadiness> }, (ms) => clock.advance(ms), scenario.reactionMs);
  return {
    status: 'ready', renderer: 'fallback', webgl: false,
    width: container.clientWidth, height: container.clientHeight,
  };
}
