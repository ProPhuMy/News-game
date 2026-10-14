import type { ErrorCode, Location } from '../shared/ids.ts';
import type { InvestigateTarget } from '../shared/protocol.ts';
import { TUNING } from '../shared/tuning.ts';
import { stream } from './rng.ts';
import type { MatchState, Seat } from './state.ts';
import { templateOf, truthAt } from './truth.ts';

export function evidenceText(s: MatchState, location: Location): string {
  const event = (s.events[s.round] ?? []).find((e) => e.location === location);
  if (!event) return s.content.quietDays[location].evidence;
  const t = templateOf(s, event);
  return event.real ? t.evidenceReal : t.evidenceInnocent;
}

export function investigate(s: MatchState, seat: Seat, target: InvestigateTarget): ErrorCode | null {
  const round = s.round;
  if (target.kind === 'location') {
    const claim = truthAt(s.events[round] ?? [], target.location);
    seat.evidence.push({ round, location: target.location, claim, text: evidenceText(s, target.location) });
    seat.investigations.push({ round, target, outcome: 'evidence' });
    return null;
  }

  const h = s.headlines.find((x) => x.id === target.headlineId);
  if (round === 1 || !h || h.seatId === seat.seatId || h.round >= round || h.exposedRound !== null) return 'BAD_TARGET';
  const { proofChance, proofChanceTipMatch } = TUNING.investigation;
  const chance = seat.tip?.location === h.location ? proofChanceTipMatch : proofChance;
  const roll = stream(s.seed, 'investigate', round, seat.seatId).next();
  const found = !h.isTrue && roll < chance;
  if (found) seat.proofs.push({ headlineId: h.id, round });
  seat.investigations.push({ round, target, outcome: found ? 'proof' : 'nothing' });
  return null;
}
