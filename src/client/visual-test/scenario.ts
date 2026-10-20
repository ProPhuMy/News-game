import { FixtureSchema, type Fixture } from '../../shared/fixture.ts';
import { PHASES, type Phase } from '../../shared/ids.ts';
import { APPROVED_PALETTE, type PaletteId } from '../visuals/palette.ts';

export interface VisualScenario {
  /** Fixture file name in src/sim/fixtures without ".json". */
  fixture: string;
  round: number;
  phase: Phase;
  /** Virtual milliseconds to run after the selected frame is applied. */
  reactionMs: number;
  reducedMotion: boolean;
  /** Seed for the harness-only Math.random replacement. */
  seed: number;
}

export const DEFAULT_SCENARIO: VisualScenario = {
  fixture: 'solo-honest',
  round: 1,
  phase: 'reveal',
  reactionMs: 6000,
  reducedMotion: false,
  seed: 1,
};

const FIXTURE_NAME = /^[a-z0-9-]+$/;

function isPhase(value: string): value is Phase {
  return (PHASES as readonly string[]).includes(value);
}

export function readInt(params: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${key} must be a whole number, got "${raw}"`);
  const value = Number(raw);
  if (value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}, got ${value}`);
  return value;
}

export function parseScenario(search: string): VisualScenario {
  const params = new URLSearchParams(search);
  const fixture = params.get('fixture') ?? DEFAULT_SCENARIO.fixture;
  if (!FIXTURE_NAME.test(fixture)) throw new Error(`fixture must match ${FIXTURE_NAME}, got "${fixture}"`);
  const phase = params.get('phase') ?? DEFAULT_SCENARIO.phase;
  if (!isPhase(phase)) throw new Error(`phase must be one of ${PHASES.join(', ')}, got "${phase}"`);
  const reduced = params.get('reducedMotion');
  if (reduced !== null && reduced !== 'true' && reduced !== 'false') {
    throw new Error(`reducedMotion must be true or false, got "${reduced}"`);
  }
  return {
    fixture,
    round: readInt(params, 'round', DEFAULT_SCENARIO.round, 0, 99),
    phase,
    reactionMs: readInt(params, 'reactionMs', DEFAULT_SCENARIO.reactionMs, 0, 120_000),
    reducedMotion: reduced === 'true',
    seed: readInt(params, 'seed', DEFAULT_SCENARIO.seed, 0, 2 ** 31 - 1),
  };
}

/** The ?palette= id for the town harness; absent means the production palette. */
export function parsePalette(search: string): PaletteId {
  const raw = new URLSearchParams(search).get('palette');
  if (raw === null) return APPROVED_PALETTE;
  if (raw !== 'a' && raw !== 'b' && raw !== 'c') throw new Error(`palette must be a, b or c, got "${raw}"`);
  return raw;
}

/** The ?noWebgl= flag: mount the town without a renderer and expect the real fallback view. */
export function parseNoWebgl(search: string): boolean {
  const raw = new URLSearchParams(search).get('noWebgl');
  if (raw !== null && raw !== 'true' && raw !== 'false') throw new Error(`noWebgl must be true or false, got "${raw}"`);
  return raw === 'true';
}

/** The ?contextCycle= flag: lose and restore the real WebGL context after readiness (town page only). */
export function parseContextCycle(search: string): boolean {
  const raw = new URLSearchParams(search).get('contextCycle');
  if (raw !== null && raw !== 'true' && raw !== 'false') throw new Error(`contextCycle must be true or false, got "${raw}"`);
  return raw === 'true';
}

/** What the town harness page mounts: the parsed scenario plus its palette and capture flags. */
export function parseTownScenario(search: string): VisualScenario & { palette: PaletteId; noWebgl: boolean; contextCycle: boolean } {
  return {
    ...parseScenario(search), palette: parsePalette(search), noWebgl: parseNoWebgl(search), contextCycle: parseContextCycle(search),
  };
}

export function parseFixture(raw: unknown): Fixture {
  return FixtureSchema.parse(raw);
}

export function selectFrameIndex(fixture: Fixture, round: number, phase: Phase): number {
  const index = fixture.frames.findIndex((frame) => frame.public.round === round && frame.public.phase === phase);
  if (index === -1) {
    const available = fixture.frames.map((frame) => `${frame.public.round}:${frame.public.phase}`).join(', ');
    throw new Error(`fixture "${fixture.name}" has no frame for round ${round} ${phase}; available: ${available}`);
  }
  return index;
}
