// Real-time busy playback (D2, for hardware FPS traces): the recorded reveal plays on the native clock with the
// production renderer. Dev-only, opt in with ?playback=realtime; screenshot mode is unchanged. The page shows its own
// fixed strings only; fixture text reaches the town as data, never as HTML.
import * as THREE from 'three';
import { SERVER_EVENTS } from '../../shared/protocol.ts';
import type { PublicSnapshot, ReactionPlan } from '../../shared/snapshots.ts';
import { GRID } from '../../shared/town-map.ts';
import type { Fixture } from '../../shared/fixture.ts';
import { createClientStore } from '../net/store.ts';
import { createTownView, mountTown, type TownView } from '../town/index.ts';
import { createTownLayout } from '../town/layout.ts';
import { getPalette } from '../visuals/palette.ts';
import type { VisualScenario } from './scenario.ts';
import type { PaletteId } from '../visuals/palette.ts';
import { publish } from './state.ts';

export type Playback = 'screenshot' | 'realtime';

export const BUSY_MARKS = { start: 'news-town:busy:start', end: 'news-town:busy:end', measure: 'news-town:busy' } as const;
/** Allowed difference between the measured playback and the recorded reaction duration. */
const DURATION_TOLERANCE_MS = 500;

export function parsePlayback(search: string): Playback {
  const raw = new URLSearchParams(search).get('playback') ?? 'screenshot';
  if (raw !== 'screenshot' && raw !== 'realtime') throw new Error(`playback must be screenshot or realtime, got "${raw}"`);
  return raw;
}

export interface PlanSummary {
  actors: number;
  multiNodeRoutes: number;
  destinations: Record<string, number>;
  behaviors: Record<string, number>;
}

export function summarizePlan(plan: ReactionPlan): PlanSummary {
  const count = (keys: string[]): Record<string, number> =>
    Object.fromEntries([...new Set(keys)].sort().map((key) => [key, keys.filter((k) => k === key).length]));
  return {
    actors: plan.citizens.length,
    multiNodeRoutes: plan.citizens.filter((entry) => entry.route.length > 1).length,
    destinations: count(plan.citizens.map((entry) => entry.route.at(-1)!)),
    behaviors: count(plan.citizens.map((entry) => entry.behavior)),
  };
}

/** Shifts the snapshot's absolute times by shiftMs so its deadline lands on the wall clock. Nothing else changes. */
export function rebasePublic(snapshot: PublicSnapshot, shiftMs: number): PublicSnapshot {
  return {
    ...snapshot,
    deadlineMs: snapshot.deadlineMs + shiftMs,
    papers: snapshot.papers.map((paper) => ({
      ...paper, lockedVisibleAtMs: paper.lockedVisibleAtMs === null ? null : paper.lockedVisibleAtMs + shiftMs,
    })),
  };
}

type Point = { x: number; z: number };

export interface RunCheck { travelled: number; maxDistanceFromDestination: number; problems: string[] }

/** Every actor must move, end within one block of its route's last node, and the run must take the recorded time. */
export function checkRun(input: {
  start: ReadonlyMap<number, Point>; end: ReadonlyMap<number, Point>; destinations: ReadonlyMap<number, Point>;
  durationMs: number; expectedMs?: number;
}): RunCheck {
  const expectedMs = input.expectedMs ?? 20_000;
  const problems: string[] = [];
  let travelled = 0;
  let maxDistance = 0;
  for (const [id, destination] of input.destinations) {
    const start = input.start.get(id); const end = input.end.get(id);
    if (!start || !end) { problems.push(`citizen ${id} has no position`); continue; }
    if (Math.hypot(end.x - start.x, end.z - start.z) > 0.5) travelled++;
    else problems.push(`citizen ${id} did not move`);
    const distance = Math.hypot(end.x - destination.x, end.z - destination.z);
    maxDistance = Math.max(maxDistance, distance);
    if (distance >= GRID.spacing) problems.push(`citizen ${id} ended ${distance.toFixed(1)} from its destination`);
  }
  if (Math.abs(input.durationMs - expectedMs) > DURATION_TOLERANCE_MS) {
    problems.push(`playback took ${Math.round(input.durationMs)} ms, expected ${expectedMs} ± ${DURATION_TOLERANCE_MS}`);
  }
  return { travelled, maxDistanceFromDestination: maxDistance, problems };
}

export interface RealtimeReport {
  fixture: string; round: number; frameIndex: number; frameAtMs: number; reactionMs: number;
  plan: PlanSummary; viewport: { width: number; height: number }; devicePixelRatio: number;
  drawingBuffer: { width: number; height: number }; palette: PaletteId; reducedMotion: boolean;
  renderer: 'webgl'; degraded: readonly string[];
  run?: RunCheck & { durationMs: number };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function panel(): { root: HTMLElement; text: HTMLElement; button: HTMLButtonElement } {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;left:12px;top:12px;z-index:10;padding:10px 14px;background:#fbf6ea;color:#22201c;'
    + 'font:14px/1.4 system-ui,sans-serif;border:1px solid #cdbb95;border-radius:6px;max-width:420px';
  const text = document.createElement('div');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Run';
  button.style.cssText = 'margin-top:8px;font:inherit;padding:4px 16px';
  button.hidden = true;
  root.append(text, button);
  document.body.appendChild(root);
  return { root, text, button };
}

/** Ready (assets awaited, warm frame drawn) → Run (20 s native playback between the marks) → Finished. */
export async function runRealtime(
  fixture: Fixture, frameIndex: number, scenario: VisualScenario & { palette: PaletteId }, container: HTMLElement,
): Promise<void> {
  const frame = fixture.frames[frameIndex]!;
  const plan = frame.public.reactionPlan;
  if (frame.public.phase !== 'reveal' || !plan) throw new Error('playback=realtime needs a reveal frame with a reaction plan');
  const ui = panel();
  ui.text.textContent = 'Loading town assets…';
  document.title = 'News Town busy: loading';

  // The recorded state just before the reveal: the town shows the start of the round, nothing plays yet.
  const shift = Date.now() - frame.atMs;
  const store = createClientStore({ send: () => {} });
  store.setConnection('connected');
  store.receive(SERVER_EVENTS.room, fixture.room);
  for (let i = 0; i < frameIndex; i++) {
    store.receive(SERVER_EVENTS.public, rebasePublic(fixture.frames[i]!.public, shift));
    store.receive(SERVER_EVENTS.private, fixture.frames[i]!.private);
  }

  let view: TownView | null = null;
  let playback: Promise<void> | null = null;
  const palette = getPalette(scenario.palette);
  mountTown(container, store, {
    reducedMotion: scenario.reducedMotion, palette,
    viewFactory: (options) => {
      const created = createTownView(options);
      const play = created.playReactionPlan.bind(created);
      created.playReactionPlan = (p, seconds) => (playback = play(p, seconds));
      view = created;
      return created;
    },
  });
  const town = view as TownView | null;
  if (!town) throw new Error('mountTown did not create a view');
  if (!town.isWebGLSupported()) throw new Error('playback=realtime refuses the no-WebGL fallback as benchmark evidence');
  const readiness = await town.whenReady();
  if (readiness.degraded.length > 0) throw new Error(`playback=realtime refuses degraded assets: ${readiness.degraded.join('; ')}`);
  await nextFrame();
  await nextFrame();
  const canvas = container.querySelector('canvas');
  if (!canvas || !town.isWebGLSupported()) throw new Error('playback=realtime: the town has no WebGL canvas');

  const report: RealtimeReport = {
    fixture: scenario.fixture, round: frame.public.round, frameIndex, frameAtMs: frame.atMs,
    reactionMs: frame.public.deadlineMs - frame.atMs, plan: summarizePlan(plan),
    viewport: { width: container.clientWidth, height: container.clientHeight }, devicePixelRatio: window.devicePixelRatio,
    drawingBuffer: { width: canvas.width, height: canvas.height }, palette: palette.id, reducedMotion: scenario.reducedMotion,
    renderer: 'webgl', degraded: readiness.degraded,
  };
  ui.text.textContent = `Ready: ${scenario.fixture} round ${frame.public.round} reveal, ${report.plan.actors} citizens, `
    + `${report.reactionMs / 1000} s. Start the trace, then press Run.`;
  ui.button.hidden = false;
  document.title = 'News Town busy: ready';
  publish({ status: 'ready', scene: 'realtime', stage: 'ready', report });

  ui.button.addEventListener('click', () => {
    void run().catch((error: unknown) => {
      ui.root.hidden = false;
      ui.text.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
      publish({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    });
  }, { once: true });

  async function run(): Promise<void> {
    ui.root.hidden = true; // nothing covers the town while it is measured
    document.title = 'News Town busy: running';
    publish({ status: 'ready', scene: 'realtime', stage: 'running', report });
    const layout = createTownLayout();
    const position = (id: number): Point => { const p = town!.getCitizenPosition(id, new THREE.Vector3()); return { x: p.x, z: p.z }; };
    const start = new Map(plan!.citizens.map((entry) => [entry.citizenId, position(entry.citizenId)]));
    const destinations = new Map(plan!.citizens.map((entry) => {
      const node = layout.getNodeWorldPos(entry.route.at(-1)!);
      return [entry.citizenId, { x: node.x, z: node.z }];
    }));

    const runShift = Date.now() - frame.atMs;
    performance.mark(BUSY_MARKS.start);
    store.receive(SERVER_EVENTS.public, rebasePublic(frame.public, runShift));
    store.receive(SERVER_EVENTS.private, frame.private);
    if (!playback) throw new Error('the town did not start the reaction plan');
    await Promise.race([
      playback,
      new Promise((_, reject) => setTimeout(() => reject(new Error('playback did not finish within 25 s')), 25_000)),
    ]);
    performance.mark(BUSY_MARKS.end);
    const durationMs = performance.measure(BUSY_MARKS.measure, BUSY_MARKS.start, BUSY_MARKS.end).duration;
    const end = new Map(plan!.citizens.map((entry) => [entry.citizenId, position(entry.citizenId)]));
    report.run = { durationMs, ...checkRun({ start, end, destinations, durationMs, expectedMs: report.reactionMs }) };

    ui.root.hidden = false;
    ui.button.hidden = true;
    ui.text.textContent = report.run.problems.length === 0
      ? `Finished: ${(durationMs / 1000).toFixed(2)} s, ${report.run.travelled}/${report.plan.actors} citizens travelled. Stop the trace.`
      : `Finished with problems: ${report.run.problems.join('; ')}`;
    document.title = 'News Town busy: finished';
    // The full report is published either way; run.problems says whether this trace is valid evidence.
    publish({ status: 'ready', scene: 'realtime', stage: 'finished', report });
  }
}
