import * as THREE from 'three';
import type { ClientStore } from '../net/store.ts';
import { createTownView, mountTown, type TownView } from '../town/index.ts';
import type { VirtualClock } from './clock.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import { settleScene, type SceneReadiness } from './settle.ts';

export type TownCapture =
  | { status: 'ready'; width: number; height: number; distinctColors: number }
  | { status: 'error'; error: string };

/**
 * Mounts the real town over the store, waits for its assets, advances the virtual clock by exactly
 * reactionMs, and measures the canvas. Shared by the town and UI harness pages.
 */
export async function mountAndSettleTown(
  container: HTMLElement,
  store: ClientStore,
  clock: VirtualClock,
  scenario: { reducedMotion: boolean; reactionMs: number },
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

  const holder: { view: TownView | null } = { view: null };
  mountTown(container, store, {
    customRenderer: renderer,
    reducedMotion: scenario.reducedMotion,
    viewFactory: (options) => {
      holder.view = createTownView(options);
      return holder.view;
    },
  });
  const view = holder.view;
  if (!view) throw new Error('mountTown did not create a view');

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
  return verdict.status === 'ready' ? { status: 'ready', ...stats } : verdict;
}
