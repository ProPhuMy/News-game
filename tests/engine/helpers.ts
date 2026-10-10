import { applyCommand, createMatch, tick, type MatchState, type SeatInit } from '../../src/engine/index.ts';
import type { Rng } from '../../src/engine/rng.ts';
import type { Headline } from '../../src/engine/state.ts';
import type { Rating } from '../../src/shared/ai.ts';
import { COLORS, type Color, type Location, type Phase, type TownClaim } from '../../src/shared/ids.ts';
import type { MatchCommand } from '../../src/shared/protocol.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';

const human = (n: number, color: Color): SeatInit => ({ kind: 'human', displayName: `Player ${n}`, paperName: `Paper ${n}`, color });
const BOT: SeatInit = { kind: 'bot' };
const config = { content: SAMPLE_CONTENT, startMs: 0 };

export const HUMAN = human(1, 'red');
/** Seat 0 human, seats 1–3 Tabloid, Gazette, Wildcard. */
export const soloMatch = (seed = 1): MatchState => createMatch(config, seed, [HUMAN, BOT, BOT, BOT]);
/** Seats 0 and 1 human, seats 2–3 Tabloid, Gazette. */
export const duoMatch = (seed = 1): MatchState => createMatch(config, seed, [HUMAN, human(2, 'blue'), BOT, BOT]);
/** Four humans, no bots: nothing happens unless the test does it. */
export const quietMatch = (seed = 1): MatchState => createMatch(config, seed, COLORS.map((c, i) => human(i + 1, c)));

const meta = (s: MatchState) => ({ actionId: 'test', round: s.round, phase: s.phase });
export const skipIntro = (s: MatchState): MatchCommand => ({ type: 'skipIntro', ...meta(s) });
export const skipInvestigate = (s: MatchState): MatchCommand => ({ type: 'skipInvestigate', ...meta(s) });
export const skipWrite = (s: MatchState): MatchCommand => ({ type: 'skipWrite', ...meta(s) });
export const checkLocation = (s: MatchState, location: Location): MatchCommand =>
  ({ type: 'investigate', ...meta(s), target: { kind: 'location', location } });
export const investigateHeadline = (s: MatchState, headlineId: string): MatchCommand =>
  ({ type: 'investigate', ...meta(s), target: { kind: 'headline', headlineId } });
export const lockClaim = (s: MatchState, location: Location, claim: TownClaim, attachEvidence = false, text = 'Big news in town'): MatchCommand =>
  ({ type: 'lockHeadline', ...meta(s), story: { kind: 'claim', location, claim, attachEvidence }, text });
export const lockExpose = (s: MatchState, headlineId: string, text = 'Caught lying!'): MatchCommand =>
  ({ type: 'lockHeadline', ...meta(s), story: { kind: 'expose', headlineId }, text });

/** Apply a command that must succeed. */
export function run(s: MatchState, seatId: number, command: MatchCommand, nowMs = s.deadlineMs - 1): MatchState {
  const r = applyCommand(s, seatId, command, nowMs);
  if (!r.result.ok) throw new Error(`command rejected: ${r.result.error}`);
  return r.state;
}

/** Tick on deadlines until the match reaches `phase` of `round`. */
export function advanceTo(s: MatchState, phase: Phase, round: number): MatchState {
  for (let guard = 0; !(s.phase === phase && s.round === round); guard++) {
    if (guard > 100 || s.phase === 'ended') throw new Error(`never reached ${phase} round ${round}`);
    s = tick(s, s.deadlineMs).state;
  }
  return s;
}

export const rated = (juiciness: number, extra: Partial<Rating> = {}): Rating =>
  ({ juiciness, onTopic: true, inappropriate: false, bubbles: ['Wow!', 'No way!'], ...extra });

export function makeHeadline(fields: Partial<Headline> & Pick<Headline, 'seatId' | 'round'>): Headline {
  return {
    id: `h${fields.round}-${fields.seatId}`, location: 'bakery', claim: 'scandal', exposeOf: null, text: 'Injected headline',
    evidence: false, isTrue: false, botAuthored: false, authorPersonality: null, rating: rated(3), revealed: true,
    exposedRound: null, ...fields,
  };
}

/** Copy of `s` with the headline added, replacing any headline with the same id. */
export function withHeadline(s: MatchState, fields: Partial<Headline> & Pick<Headline, 'seatId' | 'round'>): MatchState {
  const h = makeHeadline(fields);
  const c = structuredClone(s);
  c.headlines = [...c.headlines.filter((x) => x.id !== h.id), h].sort((a, b) => a.round - b.round || a.seatId - b.seatId);
  return c;
}

/** Rng that replays `values` in a loop: 0 makes every chance() true, 0.99 makes it false. */
export function fakeRng(...values: number[]): Rng {
  let i = 0;
  const next = () => values[i++ % values.length]!;
  const int = (n: number) => Math.floor(next() * n);
  return { next, int, chance: (p) => next() < p, pick: (xs) => xs[int(xs.length)]!, shuffle: (xs) => [...xs] };
}
