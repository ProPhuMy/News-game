import type { Phase } from '../shared/ids.ts';
import { TUNING } from '../shared/tuning.ts';
import { runBotTurns } from './bot-turns.ts';
import { finishMatch, prepareRound, revealRound } from './rounds.ts';
import type { EngineEvent, MatchState } from './state.ts';

const ACTION_PHASES: readonly Phase[] = ['intro', 'investigate', 'write'];

/**
 * An action phase may end early once every connected human has acted. With no connected human it never ends
 * early: a dropped connection must not skip phases (spec §4.5, timers keep running).
 */
export function phaseDone(s: MatchState): boolean {
  const humans = s.seats.filter((seat) => seat.controller === 'human');
  return ACTION_PHASES.includes(s.phase) && humans.length > 0 && humans.every((seat) => seat.acted);
}

function enterPhase(s: MatchState, phase: 'investigate' | 'write' | 'reveal' | 'final', nowMs: number, events: EngineEvent[]): void {
  s.phase = phase;
  s.deadlineMs = nowMs + (phase === 'investigate' && s.round === 1 ? TUNING.firstRoundInvestigateMs : TUNING.phaseMs[phase]);
  s.version++;
  for (const seat of s.seats) {
    seat.acted = false;
    seat.lockedVisibleAtMs = null;
  }
  runBotTurns(s, nowMs, events);
  events.push({ type: 'phaseStarted', round: s.round, phase, deadlineMs: s.deadlineMs });
}

function startRound(s: MatchState, round: number, nowMs: number, events: EngineEvent[]): void {
  s.round = round;
  prepareRound(s);
  enterPhase(s, 'investigate', nowMs, events);
}

function advance(s: MatchState, nowMs: number, events: EngineEvent[]): void {
  switch (s.phase) {
    case 'intro':
      return startRound(s, 1, nowMs, events);
    case 'investigate':
      return enterPhase(s, 'write', nowMs, events);
    case 'write':
      revealRound(s);
      return enterPhase(s, 'reveal', nowMs, events);
    case 'reveal':
      if (s.round < TUNING.rounds) return startRound(s, s.round + 1, nowMs, events);
      finishMatch(s);
      return enterPhase(s, 'final', nowMs, events);
    case 'final':
      s.phase = 'ended';
      s.deadlineMs = nowMs;
      s.version++;
      events.push({ type: 'matchEnded' });
      return;
    case 'ended':
      return;
    default:
      // Unreachable for valid state; throwing lets the server close just this room instead of spinning forever.
      throw new Error(`unknown phase: ${String(s.phase)}`);
  }
}

/**
 * Ends phases whose deadline passed or whose humans all acted. A new phase's deadline counts from `nowMs`,
 * so a late tick never skips a phase.
 */
export function tick(state: MatchState, nowMs: number): { state: MatchState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const due = (s: MatchState) => s.phase !== 'ended' && (nowMs >= s.deadlineMs || phaseDone(s));
  if (!due(state)) return { state, events };
  const s = structuredClone(state);
  while (due(s)) advance(s, nowMs, events);
  return { state: s, events };
}
