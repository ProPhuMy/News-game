import { TUNING } from '../shared/tuning.ts';
import { clampTrust, exposeHeadline, townChance } from './resolve.ts';
import { stream } from './rng.ts';
import { scoreOf } from './score.ts';
import type { MatchState } from './state.ts';

/** Spec §4.4: last exposure rolls, delayed +2 for honest unevidenced claims, scores and winners. */
export function finishMatch(s: MatchState): void {
  const round = TUNING.rounds + 1;
  const doomed = s.headlines.filter((h) =>
    !h.isTrue && h.exposedRound === null && stream(s.seed, 'final', h.id).chance(townChance(h, round, true)));
  const exposures = doomed.map((h) => exposeHeadline(s, h, 'final', [], round));

  const trustBonuses = s.seats.map((seat) => ({
    seatId: seat.seatId,
    amount: TUNING.trust.unevidencedTruthBonus *
      s.headlines.filter((h) => h.seatId === seat.seatId && h.isTrue && !h.evidence && h.claim !== 'expose').length,
  }));
  for (const b of trustBonuses) s.seats[b.seatId]!.trust += b.amount;
  clampTrust(s);
  s.exposures.push(...exposures);

  const records = s.seats.map((seat) => {
    const lies = s.headlines.filter((h) => h.seatId === seat.seatId && !h.isTrue);
    const caught = lies.filter((h) => h.exposedRound !== null).length;
    return { seatId: seat.seatId, liesTold: lies.length, liesCaught: caught, liesEscaped: lies.length - caught };
  });
  const scores = s.seats.map(scoreOf);
  const best = Math.max(...scores);
  s.final = { exposures, trustBonuses, records, winners: s.seats.filter((_, i) => scores[i] === best).map((seat) => seat.seatId) };
}
