import type { SeatId } from '../shared/ids.ts';
import { TUNING } from '../shared/tuning.ts';
import { juiceOf } from './rating.ts';
import { stream } from './rng.ts';
import type { Citizen, Headline, MatchState } from './state.ts';

export interface CitizenChoice { citizenId: number; from: SeatId | null; to: SeatId | null; top: Headline | null; topAppeal: number }

/** Spec §6.4 appeal of headline h for citizen c. */
export function appeal(s: MatchState, c: Citizen, h: Headline, exposedSeats: ReadonlySet<SeatId>): number {
  const t = TUNING.appeal;
  const relevance = h.location === c.favorite ? t.relevanceFavorite : t.relevanceOther;
  const juice = juiceOf(h) * c.gullibility * t.juicePerPoint;
  const trust = s.seats[h.seatId]!.trust / t.trustDivisor;
  const evidence = h.evidence ? t.evidence : 0;
  const loyalty = c.paper === h.seatId && !exposedSeats.has(h.seatId) ? t.loyalty : 0;
  const repeats = s.headlines.filter((x) =>
    x.seatId === h.seatId && x.round < h.round && x.location === h.location && x.claim === h.claim).length;
  const repeat = Math.max(t.repeatMin, -t.repeatPenalty * repeats);
  return relevance + juice + trust + evidence + loyalty + repeat;
}

/** Each citizen keeps, switches or picks up a paper. Mutates citizen.paper. */
export function chooseCitizens(s: MatchState, fresh: readonly Headline[], exposedSeats: ReadonlySet<SeatId>): CitizenChoice[] {
  const t = TUNING.appeal;
  return s.citizens.map((c): CitizenChoice => {
    const from = c.paper;
    if (fresh.length === 0) return { citizenId: c.id, from, to: from, top: null, topAppeal: 0 };
    const scored = fresh.map((h) => ({ h, a: appeal(s, c, h, exposedSeats) }));
    const max = Math.max(...scored.map((x) => x.a));
    const best = stream(s.seed, 'tie', s.round, c.id).pick(scored.filter((x) => x.a === max));
    let to = from;
    if (from === null) {
      if (best.a >= t.subscribeMin) to = best.h.seatId;
    } else {
      const own = scored.find((x) => x.h.seatId === from);
      const stay = own ? own.a : t.stayNoHeadline + s.seats[from]!.trust / t.trustDivisor;
      if (best.a > stay) to = best.h.seatId;
    }
    c.paper = to;
    return { citizenId: c.id, from, to, top: best.h, topAppeal: best.a };
  });
}
