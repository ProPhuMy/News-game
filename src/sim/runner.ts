import { botText } from '../engine/bot-turns.ts';
import { applyCommand, createMatch, privateView, publicView, tick, type MatchState, type SeatInit } from '../engine/index.ts';
import { stream } from '../engine/rng.ts';
import type { EngineContent } from '../shared/content-schema.ts';
import { COLORS } from '../shared/ids.ts';
import type { MatchCommand } from '../shared/protocol.ts';
import type { Strategy } from './strategies.ts';

export interface RunOptions {
  seed: number;
  content: EngineContent;
  /** One entry per seat; null = engine bot. */
  lineup: readonly (Strategy | null)[];
  /** How long sim humans wait into each action phase before acting. */
  thinkMs?: number;
  onFrame?: (s: MatchState, nowMs: number) => void;
  /** Runs after sim players act and before each tick; may return a changed state (fixtures use it for disconnects and ratings). */
  hook?: (s: MatchState, nowMs: number) => MatchState;
}

function act(s: MatchState, seatId: number, strategy: Strategy, nowMs: number): MatchState {
  const seat = s.seats[seatId]!;
  if (seat.controller !== 'human' || seat.acted) return s;
  const pub = publicView(s);
  const priv = privateView(s, seatId);
  const rng = stream(s.seed, 'sim', s.round, s.phase, seatId);
  const meta = { actionId: `${s.round}-${s.phase}-${seatId}`, round: s.round, phase: s.phase };
  let command: MatchCommand;
  if (s.phase === 'intro') {
    command = { type: 'skipIntro', ...meta };
  } else if (s.phase === 'investigate') {
    const d = strategy.investigate(pub, priv, rng);
    command = d.kind === 'skip' ? { type: 'skipInvestigate', ...meta } : { type: 'investigate', ...meta, target: d.target };
  } else {
    const d = strategy.write(pub, priv, rng);
    command = d.kind === 'skip'
      ? { type: 'skipWrite', ...meta }
      : { type: 'lockHeadline', ...meta, story: d.story, text: botText(s, seat, d.story, rng) };
  }
  const r = applyCommand(s, seatId, command, nowMs);
  if (!r.result.ok) throw new Error(`${strategy.name} sent an invalid ${command.type}: ${r.result.error}`);
  return r.state;
}

/** Play one match headlessly. Time jumps to the next interesting moment, so a match takes milliseconds. */
export function runMatch(opts: RunOptions): MatchState {
  const seats = opts.lineup.map((strategy, i): SeatInit =>
    strategy ? { kind: 'human', displayName: strategy.name, paperName: `The ${strategy.name} Post`, color: COLORS[i]! } : { kind: 'bot' });
  let s = createMatch({ content: opts.content, startMs: 0 }, opts.seed, seats);
  let now = 0;
  let phaseStart = 0;
  opts.onFrame?.(s, now);

  for (let guard = 0; s.phase !== 'ended'; guard++) {
    if (guard > 2_000) throw new Error(`match stalled in ${s.phase}, round ${s.round}`);
    const version = s.version;
    const acting = s.phase === 'intro' || s.phase === 'investigate' || s.phase === 'write';
    const actAt = phaseStart + (opts.thinkMs ?? 0);
    if (acting && now >= actAt) {
      opts.lineup.forEach((strategy, seatId) => { if (strategy) s = act(s, seatId, strategy, now); });
    }
    // After acts, before tick: a fresh lock is still unrevealed here, so a hook can rate it.
    if (opts.hook) s = opts.hook(s, now);
    const phaseKey = `${s.round}/${s.phase}`;
    s = tick(s, now).state;
    if (`${s.round}/${s.phase}` !== phaseKey) phaseStart = now;
    if (s.version !== version) opts.onFrame?.(s, now);
    else now = acting && now < actAt ? Math.min(actAt, s.deadlineMs) : s.deadlineMs;
  }
  return s;
}
