// Dev-only screenshot harness. Not part of the production build (vite build only builds src/client/index.html).
import * as THREE from 'three';
import { SERVER_EVENTS } from '../../shared/protocol.ts';
import { createClientStore } from '../net/store.ts';
import { createTownView, mountTown, type TownView } from '../town/index.ts';
import { createVirtualClock } from './clock.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import { parseFixture, parseScenario, selectFrameIndex } from './scenario.ts';
import { settleScene, type SceneReadiness } from './settle.ts';
import { runInspection } from './inspect.ts';
import { sceneKind } from './inspection-scenario.ts';
import { publish } from './state.ts';

const fixtureLoaders = import.meta.glob<unknown>('../../sim/fixtures/*.json', { import: 'default' });

async function run(): Promise<void> {
  publish({ status: 'loading' });
  if (sceneKind(window.location.search) === 'inspect-character') {
    const container = document.getElementById('town');
    if (!container) throw new Error('missing #town container');
    publish(await runInspection(window.location.search, container));
    return;
  }
  const scenario = parseScenario(window.location.search);
  const loader = fixtureLoaders[`../../sim/fixtures/${scenario.fixture}.json`];
  if (!loader) throw new Error(`unknown fixture "${scenario.fixture}"; known: ${Object.keys(fixtureLoaders).join(', ')}`);
  const fixture = parseFixture(await loader());
  const frameIndex = selectFrameIndex(fixture, scenario.round, scenario.phase);

  const container = document.getElementById('town');
  if (!container) throw new Error('missing #town container');

  // Engine time and every deadline share one clock, so the virtual epoch starts at the frame time.
  const clock = createVirtualClock(fixture.frames[frameIndex]!.atMs, scenario.seed);
  clock.install();

  const store = createClientStore({ send: () => {} });
  store.setConnection('connected');
  store.receive(SERVER_EVENTS.room, fixture.room);
  for (let i = 0; i <= frameIndex; i++) {
    const frame = fixture.frames[i]!;
    store.receive(SERVER_EVENTS.public, frame.public);
    store.receive(SERVER_EVENTS.private, frame.private);
  }

  let renderer: THREE.WebGLRenderer;
  try {
    // Same settings as src/client/town/scene.ts, plus preserveDrawingBuffer so the frame can be measured.
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
  } catch {
    publish({ status: 'error', error: 'webgl-unavailable' });
    return;
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
  if (readiness.degraded.length > 0) {
    publish({ status: 'error', error: `degraded-assets: ${readiness.degraded.join('; ')}` });
    return;
  }

  const stats = measureCanvas(renderer.domElement);
  const verdict = readyVerdict({ webgl: view.isWebGLSupported(), distinctColors: stats.distinctColors });
  publish(verdict.status === 'ready' ? { status: 'ready', scene: 'town', scenario, ...stats } : verdict);
}

run().catch((error: unknown) => {
  publish({ status: 'error', error: error instanceof Error ? error.message : String(error) });
});
