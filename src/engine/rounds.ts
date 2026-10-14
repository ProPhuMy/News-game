// src/engine/rounds.ts — round hooks called by the phase machine. Filled in by Tasks 8, 11 and 14.
import type { MatchState } from './state.ts';
import { assignTips } from './tips.ts';
import { rollEvents } from './truth.ts';

export function prepareRound(s: MatchState): void {
  const events = rollEvents(s.seed, s.round, s.content.eventTemplates);
  s.events[s.round] = events;
  const tips = assignTips(s.seed, s.round, events, s.content.eventTemplates, s.seats.length);
  s.seats.forEach((seat, i) => { seat.tip = tips[i]!; });
}

export { revealRound } from './resolve.ts';

export { finishMatch } from './final.ts';
