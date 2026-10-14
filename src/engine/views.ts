import { PULLED_TEXT } from '../shared/ids.ts';
import type { Story } from '../shared/protocol.ts';
import type { HeadlinePublic, PrivateSnapshot, PublicSnapshot } from '../shared/snapshots.ts';
import { scoreOf, sum } from './score.ts';
import type { Headline, MatchState } from './state.ts';

export function storyOf(h: Headline): Story {
  if (h.claim === 'expose') return { kind: 'expose', headlineId: h.exposeOf! };
  return { kind: 'claim', location: h.location, claim: h.claim, attachEvidence: h.evidence };
}

/** Everything every client may see. Never includes events, unrevealed headlines, tips, cards or gullibility. */
export function publicView(s: MatchState): PublicSnapshot {
  const allTruth = s.phase === 'final' || s.phase === 'ended';
  return {
    version: s.version,
    round: s.round,
    phase: s.phase,
    deadlineMs: s.deadlineMs,
    papers: s.seats.map((seat) => ({
      seatId: seat.seatId, displayName: seat.displayName, paperName: seat.paperName, color: seat.color,
      personality: seat.personality, controller: seat.controller, trust: seat.trust,
      readers: seat.readers.at(-1) ?? 0, totalReaders: sum(seat.readers), score: scoreOf(seat),
      lockedVisibleAtMs: s.phase === 'write' ? seat.lockedVisibleAtMs : null,
    })),
    headlines: s.headlines.filter((h) => h.revealed).map((h): HeadlinePublic => {
      const pulled = h.rating?.inappropriate ?? false;
      const known = allTruth || h.exposedRound !== null || h.evidence;
      return {
        id: h.id, seatId: h.seatId, round: h.round, location: h.location, claim: h.claim, exposeOf: h.exposeOf,
        text: pulled ? PULLED_TEXT : h.text, pulled, evidence: h.evidence, exposed: h.exposedRound !== null,
        truth: known ? (h.isTrue ? 'true' : 'lie') : 'unknown',
      };
    }),
    exposures: s.exposures,
    reactionPlan: s.reactionPlan,
    citizens: s.citizens.map((c) => ({ id: c.id, home: c.home, paper: c.paper })),
    final: s.final,
  };
}

/** What one seat may see on top of the public view. */
export function privateView(s: MatchState, seatId: number): PrivateSnapshot {
  const seat = s.seats[seatId];
  if (!seat) throw new Error(`no seat ${seatId}`);
  const exposed = new Set(s.headlines.filter((h) => h.exposedRound !== null).map((h) => h.id));
  const mine = s.headlines.find((h) => h.seatId === seatId && h.round === s.round && !h.revealed);
  return {
    version: s.version,
    seatId,
    tip: seat.tip,
    evidence: seat.evidence,
    proofs: seat.proofs.filter((p) => !exposed.has(p.headlineId)),
    investigations: seat.investigations,
    acted: seat.acted,
    lockedHeadline: mine ? { id: mine.id, story: storyOf(mine), text: mine.text } : null,
  };
}
