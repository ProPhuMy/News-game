import type { ErrorCode } from '../shared/ids.ts';
import { HeadlineTextSchema, type Story } from '../shared/protocol.ts';
import { TUNING } from '../shared/tuning.ts';
import { fallbackRating } from './rating.ts';
import { stream } from './rng.ts';
import type { EngineEvent, Headline, MatchState, Seat } from './state.ts';
import { truthAt } from './truth.ts';

export const byRoundSeat = (a: Headline, b: Headline): number => a.round - b.round || a.seatId - b.seatId;

export function lockHeadline(s: MatchState, seat: Seat, story: Story, rawText: string, nowMs: number, events: EngineEvent[]): ErrorCode | null {
  const text = HeadlineTextSchema.safeParse(rawText);
  if (!text.success) return 'BAD_TEXT';
  const botAuthored = seat.controller !== 'human';
  const base = {
    id: `h${s.round}-${seat.seatId}`, seatId: seat.seatId, round: s.round, text: text.data, botAuthored,
    authorPersonality: botAuthored ? (seat.personality ?? 'gazette') : null,
    rating: null, revealed: false, exposedRound: null,
  };

  let headline: Headline;
  let exposedHeadlineText: string | undefined;
  if (story.kind === 'claim') {
    const matches = seat.evidence.some((c) => c.round === s.round && c.location === story.location && c.claim === story.claim);
    if (story.attachEvidence && !matches) return 'EVIDENCE_MISMATCH';
    headline = {
      ...base, location: story.location, claim: story.claim, exposeOf: null, evidence: story.attachEvidence,
      isTrue: truthAt(s.events[s.round] ?? [], story.location) === story.claim,
    };
  } else {
    const target = s.headlines.find((h) => h.id === story.headlineId);
    if (!target || target.exposedRound !== null || !seat.proofs.some((p) => p.headlineId === target.id)) return 'NO_PROOF';
    headline = { ...base, location: target.location, claim: 'expose', exposeOf: target.id, evidence: false, isTrue: true };
    exposedHeadlineText = target.text;
  }

  s.headlines.push(headline);
  s.headlines.sort(byRoundSeat);
  const { min, max } = TUNING.botLockDelayMs;
  seat.lockedVisibleAtMs = botAuthored ? nowMs + min + stream(s.seed, 'lockDelay', s.round, seat.seatId).int(max - min + 1) : nowMs;
  events.push({
    type: 'headlineLocked', headlineId: headline.id, seatId: seat.seatId, text: headline.text,
    location: headline.location, claim: headline.claim, exposedHeadlineText, botPersonality: headline.authorPersonality,
    fallbackRating: fallbackRating(s, headline),
  });
  return null;
}
