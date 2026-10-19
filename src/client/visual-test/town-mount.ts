import * as THREE from 'three';
import type { ClientStore } from '../net/store.ts';
import { createTownView, mountTown, type TownView, type TownViewOptions } from '../town/index.ts';
import { getPalette, type PaletteId } from '../visuals/palette.ts';
import type { VirtualClock } from './clock.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import { settleScene, type SceneReadiness } from './settle.ts';

export type TownCapture =
  | { status: 'ready'; palette: PaletteId; width: number; height: number; distinctColors: number }
  | { status: 'error'; error: string };

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

/**
 * Mounts the real town over the store, waits for its assets, advances the virtual clock by exactly
 * reactionMs, and measures the canvas. Shared by the town and UI harness pages.
 */
export async function mountAndSettleTown(
  container: HTMLElement,
  store: ClientStore,
  clock: VirtualClock,
  scenario: { reducedMotion: boolean; reactionMs: number; palette: PaletteId },
): Promise<TownCapture> {
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
  mountTown(container, store, {
    customRenderer: renderer,
    reducedMotion: scenario.reducedMotion,
    palette: getPalette(scenario.palette),
    viewFactory: recordingFactory(holder),
  });
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

  const stats = measureCanvas(renderer.domElement);
  const verdict = readyVerdict({ webgl: view.isWebGLSupported(), distinctColors: stats.distinctColors });
  return verdict.status === 'ready' ? { status: 'ready', palette: holder.palette, ...stats } : verdict;
}
