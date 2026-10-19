// Dev-only UI screenshot harness: the real AppRouter and town over a fixture-fed store (never in the production build).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SERVER_EVENTS } from '../../shared/protocol.ts';
import { createClientStore } from '../net/store.ts';
import type { ClientMessage } from '../../shared/protocol.ts';
import { AppRouter } from '../ui/screens/AppRouter.tsx';
import { applyPaletteCssVariables, getPalette } from '../visuals/palette.ts';
import { parseAppScenario, type HarnessScreen } from './app-scenario.ts';
import { createVirtualClock } from './clock.ts';
import { parseFixture, selectFrameIndex } from './scenario.ts';
import { publish } from './state.ts';
import { stressFixture } from './stress-text.ts';
import { mountAndSettleTown } from './town-mount.ts';

const fixtureLoaders = import.meta.glob<unknown>('../../sim/fixtures/*.json', { import: 'default' });

/** The element each screen must show before capture. */
const SCREEN_TEST_ID: Readonly<Record<HarnessScreen, string>> = {
  match: 'hud-overlay', loading: 'match-loading', disconnected: 'connection-overlay', error: 'hud-error',
};

async function waitFor(selector: string, timeoutMs = 10_000): Promise<void> {
  const started = performance.now();
  // Real timers: the virtual clock only replaces Date.now, performance.now and animation frames.
  while (!document.querySelector(selector)) {
    if (performance.now() - started > timeoutMs) throw new Error(`screen did not show ${selector}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function run(): Promise<void> {
  publish({ status: 'loading' });
  const scenario = parseAppScenario(window.location.search);
  applyPaletteCssVariables(document.documentElement, getPalette(scenario.palette));
  const loader = fixtureLoaders[`../../sim/fixtures/${scenario.fixture}.json`];
  if (!loader) throw new Error(`unknown fixture "${scenario.fixture}"; known: ${Object.keys(fixtureLoaders).join(', ')}`);
  const recorded = parseFixture(await loader());
  // A presentation copy: the recorded fixture object is never changed.
  const fixture = scenario.stressText ? stressFixture(recorded) : recorded;
  const frameIndex = selectFrameIndex(fixture, scenario.round, scenario.phase);
  const frame = fixture.frames[frameIndex]!;

  const clock = createVirtualClock(frame.atMs, scenario.seed);
  clock.install();

  const sent: ClientMessage[] = [];
  const store = createClientStore({ send: (message) => { sent.push(message); } });
  const lastActionId = () => sent[sent.length - 1]!.actionId;
  store.setConnection('connected');

  // Seat the viewer through the store's public API: a playSolo answered by a successful ack.
  const you = fixture.room.seats.find((seat) => seat.seatId === fixture.room.you);
  store.actions.playSolo({ displayName: you?.displayName ?? 'Editor', paperName: you?.paperName ?? 'Paper', color: you?.color ?? 'red' });
  store.receive(SERVER_EVENTS.ack, {
    actionId: lastActionId(), ok: true, serverNowMs: Date.now(),
    session: { code: fixture.room.code, seatId: fixture.room.you, token: '0'.repeat(32) },
  });
  store.receive(SERVER_EVENTS.room, fixture.room);
  if (scenario.screen !== 'loading') {
    for (let i = 0; i <= frameIndex; i++) {
      store.receive(SERVER_EVENTS.public, fixture.frames[i]!.public);
      store.receive(SERVER_EVENTS.private, fixture.frames[i]!.private);
    }
  }
  if (scenario.screen === 'disconnected') store.setConnection('disconnected');
  if (scenario.screen === 'error') {
    store.actions.skipIntro();
    store.receive(SERVER_EVENTS.ack, { actionId: lastActionId(), ok: false, error: 'STALE_PHASE', serverNowMs: Date.now() });
  }

  const townContainer = document.getElementById('town-canvas-container');
  const uiRoot = document.getElementById('ui-root');
  if (!townContainer || !uiRoot) throw new Error('missing #town-canvas-container or #ui-root');
  const town = await mountAndSettleTown(townContainer, store, clock, scenario);
  if (town.status !== 'ready') { publish(town); return; }

  createRoot(uiRoot).render(<React.StrictMode><AppRouter store={store} /></React.StrictMode>);
  await waitFor(`[data-testid="${SCREEN_TEST_ID[scenario.screen]}"]`);
  await document.fonts.ready;
  publish({ ...town, scene: 'app', scenario, screen: scenario.screen });
}

run().catch((error: unknown) => {
  publish({ status: 'error', error: error instanceof Error ? error.message : String(error) });
});
