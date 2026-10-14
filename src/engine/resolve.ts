import type { SeatId } from '../shared/ids.ts';
import type { Exposure } from '../shared/snapshots.ts';
import { TUNING } from '../shared/tuning.ts';
import { chooseCitizens } from './citizens.ts';
import { fallbackRating, juiceOf } from './rating.ts';
import { stream } from './rng.ts';
import type { Headline, MatchState } from './state.ts';
import { templateOf } from './truth.ts';

/** Chance the town exposes an unexposed lie this round (spec §6.2). */
export function townChance(h: Headline, currentRound: number, final = false): number {
  const t = TUNING.townExposure;
  const p = t.base + t.perJuice * juiceOf(h) + t.perRoundSurvived * (currentRound - h.round - 1);
  return final ? Math.min(p * t.finalMultiplier, t.finalCap) : Math.min(p, 1);
}

export function explanationFor(s: MatchState, h: Headline): string {
  const event = (s.events[h.round] ?? []).find((e) => e.location === h.location);
  if (!event) return s.content.quietDays[h.location].explanation;
  const t = templateOf(s, event);
  return event.real ? t.explanationReal : t.explanationInnocent;
}

/** Mark a lie exposed and charge its paper once. */
export function exposeHeadline(s: MatchState, h: Headline, source: Exposure['source'], exposers: SeatId[], round: number): Exposure {
  h.exposedRound = round;
  const trustDelta = -(TUNING.trust.exposedBase + TUNING.trust.exposedPerJuice * juiceOf(h));
  s.seats[h.seatId]!.trust += trustDelta;
  return { headlineId: h.id, seatId: h.seatId, round, source, exposers, trustDelta, explanation: explanationFor(s, h) };
}

export function clampTrust(s: MatchState): void {
  for (const seat of s.seats) seat.trust = Math.min(TUNING.trust.max, Math.max(TUNING.trust.min, seat.trust));
}

/** Spec §6.1, steps in order. Inputs are sorted by seat/headline id, so arrival order never matters. */
export function revealRound(s: MatchState): void {
  const round = s.round;
  const fresh = s.headlines.filter((h) => h.round === round);
  for (const h of fresh) {
    h.rating ??= fallbackRating(s, h);
    h.revealed = true;
  }
  const exposures: Exposure[] = [];

  // 1. Player exposes
  const targets = [...new Set(fresh.flatMap((h) => (h.exposeOf ? [h.exposeOf] : [])))].sort();
  for (const id of targets) {
    const target = s.headlines.find((h) => h.id === id)!;
    if (target.exposedRound !== null) continue;
    const exposers = fresh.filter((h) => h.exposeOf === id).map((h) => h.seatId);
    exposures.push(exposeHeadline(s, target, 'player', exposers, round));
    for (const seatId of exposers) s.seats[seatId]!.trust += TUNING.trust.exposeBonus;
  }

  // 2. Town exposure rolls for earlier, still-hidden lies
  for (const h of s.headlines) {
    if (h.round >= round || h.isTrue || h.exposedRound !== null) continue;
    if (stream(s.seed, 'town', round, h.id).chance(townChance(h, round))) exposures.push(exposeHeadline(s, h, 'town', [], round));
  }

  // 3. Evidence trust
  for (const h of fresh) if (h.evidence) s.seats[h.seatId]!.trust += TUNING.trust.evidenceBonus;

  // 4. Clamp
  clampTrust(s);
  s.exposures.push(...exposures);

  // 5. Citizens choose and readers are counted
  const exposedSeats = new Set(exposures.map((e) => e.seatId));
  chooseCitizens(s, fresh, exposedSeats);
  for (const seat of s.seats) seat.readers.push(s.citizens.filter((c) => c.paper === seat.seatId).length);

  // 6. Reaction plan (Task 13)
}
