import { describe, expect, it } from 'vitest';
import { privateView, publicView, tick, type MatchState } from '../../src/engine/index.ts';
import { advanceTo, checkLocation, lockClaim, lockExpose, quietMatch, run, skipIntro, soloMatch, withHeadline } from './helpers.ts';

/** Seat 0 checks its tip, then prints its tip claim; snapshots are inspected at every step. */
function* steps(seed: number): Generator<MatchState> {
  let s = soloMatch(seed);
  s = run(s, 0, skipIntro(s), 0);
  while (s.phase !== 'ended') {
    yield s;
    const tip = s.seats[0]!.tip;
    if (!s.seats[0]!.acted && tip && s.phase === 'investigate') s = run(s, 0, checkLocation(s, tip.location));
    else if (!s.seats[0]!.acted && tip && s.phase === 'write') s = run(s, 0, lockClaim(s, tip.location, tip.claim));
    s = tick(s, s.phase === 'reveal' || s.phase === 'final' ? s.deadlineMs : s.deadlineMs - 1).state;
  }
}

describe('privacy', () => {
  it('public snapshots never carry hidden truth, tips, cards, gullibility or unrevealed headlines', () => {
    for (const seed of [1, 2, 3]) {
      for (const s of steps(seed)) {
        const json = JSON.stringify(publicView(s));
        for (const key of ['"gullibility"', '"favorite"', '"isTrue"', '"real"', '"templateId"', '"tip"', '"proofs"']) expect(json).not.toContain(key);
        for (const seat of s.seats) if (seat.tip) expect(json).not.toContain(seat.tip.text);
        for (const h of s.headlines.filter((x) => !x.revealed)) expect(json).not.toContain(`"${h.id}"`);
        const view = publicView(s);
        if (s.phase !== 'final' && s.phase !== 'ended') {
          for (const h of view.headlines) if (!h.exposed && !h.evidence) expect(h.truth).toBe('unknown');
        }
      }
    }
  });

  it('private snapshots carry only the seat\'s own tip, cards and headline', () => {
    for (const s of steps(4)) {
      const mine = privateView(s, 0);
      expect(mine.evidence).toEqual(s.seats[0]!.evidence);
      const json = JSON.stringify(mine);
      for (const other of s.seats.slice(1)) if (other.tip && other.tip.text !== s.seats[0]!.tip?.text) expect(json).not.toContain(other.tip.text);
      for (const h of s.headlines.filter((x) => x.seatId !== 0 && !x.revealed)) expect(json).not.toContain(`"${h.id}"`);
    }
  });

  it('drops a proof card once anyone exposes its headline', () => {
    const s = withHeadline(advanceTo(quietMatch(), 'write', 2), { seatId: 1, round: 1, location: 'bank' });
    s.seats[0]!.proofs.push({ headlineId: 'h1-1', round: 2 });
    s.seats[2]!.proofs.push({ headlineId: 'h1-1', round: 2 });
    const exposed = tick(run(s, 2, lockExpose(s, 'h1-1')), s.deadlineMs).state;
    expect(privateView(exposed, 0).proofs).toEqual([]);
  });

  it('each of the four private views holds only its own seat\'s secrets', () => {
    let s = advanceTo(quietMatch(), 'write', 2);
    s = withHeadline(s, { seatId: 0, round: 1 });
    s.seats.forEach((seat, i) => {
      seat.tip = { round: 2, location: 'bank', claim: 'scandal', text: `SECRET-TIP-${i}` };
      seat.evidence = [{ round: 2, location: 'bank', claim: 'all_clear', text: `SECRET-EVIDENCE-${i}` }];
      seat.proofs = i === 0 ? [] : [{ headlineId: 'h1-0', round: 2 }];
    });
    s = run(s, 1, lockClaim(s, 'bank', 'scandal', false, 'SECRET-HEADLINE-1'));
    const pub = JSON.stringify(publicView(s));
    expect(pub).not.toMatch(/SECRET-/);
    for (let seat = 0; seat < 4; seat++) {
      const json = JSON.stringify(privateView(s, seat));
      expect(json).toContain(`SECRET-TIP-${seat}`);
      expect(json).toContain(`SECRET-EVIDENCE-${seat}`);
      for (let other = 0; other < 4; other++) {
        if (other === seat) continue;
        expect(json).not.toContain(`SECRET-TIP-${other}`);
        expect(json).not.toContain(`SECRET-EVIDENCE-${other}`);
      }
      expect(json.includes('SECRET-HEADLINE-1')).toBe(seat === 1);
      expect(privateView(s, seat).proofs).toEqual(s.seats[seat]!.proofs);
    }
  });
});
