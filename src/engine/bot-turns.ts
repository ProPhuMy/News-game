// src/engine/bot-turns.ts — bots and the Caretaker act at the start of each phase. Real decisions arrive in Task 17.
import type { EngineEvent, MatchState } from './state.ts';

export function runBotTurns(s: MatchState, _nowMs: number, _events: EngineEvent[]): void {
  for (const seat of s.seats) if (seat.controller !== 'human') seat.acted = true;
}
