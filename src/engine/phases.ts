import type { Phase } from '../shared/ids.ts';
import { TUNING } from '../shared/tuning.ts';
import { runBotTurns } from './bot-turns.ts';
import { finishMatch, prepareRound, revealRound } from './rounds.ts';
import type { EngineEvent, MatchState } from './state.ts';

const ACTION_PHASES: readonly Phase[] = ['intro', 'investigate', 'write'];

/** Every connected human has acted, so an action phase may end early. Bots and the Caretaker act instantly. */
export function phaseDone(s: MatchState): boolean {
  return ACTION_PHASES.includes(s.phase) && s.seats.every((seat) => seat.controller !== 'human' || seat.acted);
}

function enterPhase(s: MatchState, phase: 'investigate' | 'write' | 'reveal' | 'final', nowMs: number, events: EngineEvent[]): void {
  s.phase = phase;
  s.deadlineMs = nowMs + TUNING.phaseMs[phase];
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
  }
}

/**
 * Ends phases whose deadline passed or whose humans all acted. A new phase's deadline counts from `nowMs`,
 * so a late tick never skips a phase. With no connected humans, action phases chain instantly.
 */
export function tick(state: MatchState, nowMs: number): { state: MatchState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const due = (s: MatchState) => s.phase !== 'ended' && (nowMs >= s.deadlineMs || phaseDone(s));
  if (!due(state)) return { state, events };
  const s = structuredClone(state);
  while (due(s)) advance(s, nowMs, events);
  return { state: s, events };
}
