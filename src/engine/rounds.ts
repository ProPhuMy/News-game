// src/engine/rounds.ts — round hooks called by the phase machine. Filled in by Tasks 8, 11 and 14.
import type { MatchState } from './state.ts';

export function prepareRound(s: MatchState): void {
  s.events[s.round] = [];
}

export function revealRound(_s: MatchState): void {}

export function finishMatch(_s: MatchState): void {}
