// Dev-only screenshot harness. Not part of the production build (vite build only builds src/client/index.html).
import { SERVER_EVENTS } from '../../shared/protocol.ts';
import { createClientStore } from '../net/store.ts';
import { createVirtualClock } from './clock.ts';
import { parseFixture, parseTownScenario, selectFrameIndex } from './scenario.ts';
import { mountAndSettleTown } from './town-mount.ts';
import { runArchitecture } from './architecture.ts';
import { runInspection } from './inspect.ts';
import { sceneKind } from './inspection-scenario.ts';
import { publish } from './state.ts';

const fixtureLoaders = import.meta.glob<unknown>('../../sim/fixtures/*.json', { import: 'default' });

async function run(): Promise<void> {
  publish({ status: 'loading' });
  const kind = sceneKind(window.location.search);
  if (kind === 'inspect-character' || kind === 'architecture') {
    const container = document.getElementById('town');
    if (!container) throw new Error('missing #town container');
    const runScene = kind === 'architecture' ? runArchitecture : runInspection;
    publish(await runScene(window.location.search, container));
    return;
  }
  const scenario = parseTownScenario(window.location.search);
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

  const town = await mountAndSettleTown(container, store, clock, scenario);
  publish(town.status === 'ready' ? { ...town, scene: 'town', scenario } : town);
}

run().catch((error: unknown) => {
  publish({ status: 'error', error: error instanceof Error ? error.message : String(error) });
});
