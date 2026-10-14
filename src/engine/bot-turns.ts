import { decideInvestigate, decideWrite } from '../bots/personalities.ts';
import { fillTemplate } from '../shared/content-schema.ts';
import { LOCATION_NAMES } from '../shared/ids.ts';
import type { Story } from '../shared/protocol.ts';
import { investigate } from './investigate.ts';
import { stream, type Rng } from './rng.ts';
import type { EngineEvent, MatchState, Seat } from './state.ts';
import { privateView, publicView } from './views.ts';
import { lockHeadline } from './write.ts';

/** Template headline for a bot story. The AI may replace it before reveal via applyRating(…, botText). */
export function botText(s: MatchState, seat: Seat, story: Story, rng: Rng): string {
  const target = story.kind === 'expose' ? s.headlines.find((h) => h.id === story.headlineId) : undefined;
  const claim = story.kind === 'expose' ? 'expose' : story.claim;
  const location = story.kind === 'expose' ? (target?.location ?? 'fountain_square') : story.location;
  const paper = target ? s.seats[target.seatId]!.paperName : seat.paperName;
  return fillTemplate(rng.pick(s.content.botHeadlines[claim]), { location: LOCATION_NAMES[location], paper });
}

function actFor(s: MatchState, seat: Seat, nowMs: number, events: EngineEvent[]): void {
  const personality = seat.personality ?? 'gazette'; // the Caretaker plays Gazette
  const rng = stream(s.seed, 'bot', s.round, s.phase, seat.seatId);
  if (s.phase === 'investigate') {
    const d = decideInvestigate(personality, publicView(s), privateView(s, seat.seatId), rng);
    if (d.kind === 'investigate') investigate(s, seat, d.target);
  } else if (s.phase === 'write') {
    const d = decideWrite(personality, publicView(s), privateView(s, seat.seatId), rng);
    if (d.kind === 'lock') lockHeadline(s, seat, d.story, botText(s, seat, d.story, rng), nowMs, events);
  }
}

/** Bots and the Caretaker decide instantly for every seat that hasn't acted this phase. */
export function runBotTurns(s: MatchState, nowMs: number, events: EngineEvent[]): void {
  for (const seat of s.seats) {
    if (seat.controller === 'human' || seat.acted) continue;
    actFor(s, seat, nowMs, events);
    seat.acted = true;
  }
}
