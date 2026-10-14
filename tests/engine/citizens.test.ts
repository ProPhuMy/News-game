import { describe, expect, it } from 'vitest';
import { appeal, chooseCitizens } from '../../src/engine/citizens.ts';
import type { MatchState } from '../../src/engine/index.ts';
import type { Citizen, Headline } from '../../src/engine/state.ts';
import { advanceTo, makeHeadline, quietMatch, rated, soloMatch } from './helpers.ts';
import { tick } from '../../src/engine/index.ts';
import { TUNING } from '../../src/shared/tuning.ts';

const t = TUNING.appeal;
/** Appeal of a scandal (rated 3, effective juice 3) for a citizen with gullibility 0.5, paper trust 50. */
const BASE = t.relevanceFavorite + 3 * 0.5 * t.juicePerPoint + 50 / t.trustDivisor;
/** A dull all_clear at the clinic (effective juice 1) scores relevanceOther + 0.5 × juicePerPoint + trust/5. */
const dullAppeal = (trust: number) => t.relevanceOther + 0.5 * t.juicePerPoint + trust / t.trustDivisor;
const trustForDull = (appealWanted: number) => (appealWanted - t.relevanceOther - 0.5 * t.juicePerPoint) * t.trustDivisor;

const citizen = (over: Partial<Citizen> = {}): Citizen => ({ id: 0, home: 'r0c1', favorite: 'bakery', gullibility: 0.5, paper: null, ...over });
const fresh = (over: Partial<Headline> & Pick<Headline, 'seatId'>): Headline =>
  makeHeadline({ round: 2, location: 'bakery', claim: 'scandal', rating: rated(3), isTrue: true, ...over });

function at(round: number, ...citizens: Citizen[]): MatchState {
  const s = structuredClone(quietMatch());
  s.round = round;
  s.citizens = citizens;
  return s;
}

describe('appeal', () => {
  const s = at(2);
  const none = new Set<number>();

  it('adds relevance, juice, trust, evidence and loyalty', () => {
    expect(appeal(s, citizen(), fresh({ seatId: 1 }), none)).toBe(BASE);
    expect(appeal(s, citizen({ favorite: 'clinic' }), fresh({ seatId: 1 }), none)).toBe(BASE - t.relevanceFavorite + t.relevanceOther);
    expect(appeal(s, citizen(), fresh({ seatId: 1, evidence: true }), none)).toBe(BASE + t.evidence);
    expect(appeal(s, citizen({ paper: 1 }), fresh({ seatId: 1 }), none)).toBe(BASE + t.loyalty);
  });

  it('drops loyalty for a paper exposed this reveal', () => {
    expect(appeal(s, citizen({ paper: 1 }), fresh({ seatId: 1 }), new Set([1]))).toBe(BASE);
  });

  it('penalises repeating the same location and claim, down to −20', () => {
    const repeated = (n: number) => {
      const r = at(4);
      for (let i = 1; i <= n; i++) r.headlines.push(makeHeadline({ seatId: 1, round: i, location: 'bakery', claim: 'scandal' }));
      return appeal(r, citizen(), fresh({ seatId: 1, round: 4 }), none);
    };
    const pen = (n: number) => Math.max(t.repeatMin, -t.repeatPenalty * n);
    expect([repeated(0), repeated(1), repeated(2), repeated(3)]).toEqual([0, 1, 2, 3].map((n) => BASE + pen(n)));
    expect(pen(3)).toBe(t.repeatMin);
  });
});

describe('chooseCitizens', () => {
  const dull = (seatId: number) => fresh({ seatId, location: 'clinic', claim: 'all_clear', rating: rated(1) });

  it('subscribes an unsubscribed citizen only when the best appeal reaches subscribeMin', () => {
    const s = at(2, citizen());
    s.seats[1]!.trust = trustForDull(t.subscribeMin);
    expect(chooseCitizens(s, [dull(1)], new Set())[0]!.to).toBe(1);
    const u = at(2, citizen());
    u.seats[1]!.trust = trustForDull(t.subscribeMin - 1);
    expect(chooseCitizens(u, [dull(1)], new Set())[0]!.to).toBeNull();
  });

  it('switches a subscriber only when the best beats staying (6 + trust/5 when their paper printed nothing)', () => {
    const stay = t.stayNoHeadline + 50 / t.trustDivisor;
    const s = at(2, citizen({ paper: 1 }));
    s.seats[2]!.trust = trustForDull(stay - 1);
    expect(dullAppeal(s.seats[2]!.trust)).toBe(stay - 1);
    expect(chooseCitizens(s, [dull(2)], new Set())[0]!.to).toBe(1);
    const u = at(2, citizen({ paper: 1 }));
    expect(BASE - t.relevanceFavorite + t.relevanceOther).toBeGreaterThan(stay);
    expect(chooseCitizens(u, [fresh({ seatId: 2, location: 'clinic' })], new Set())[0]!.to).toBe(2);
    expect(u.citizens[0]!.paper).toBe(2);
  });

  it('breaks ties with the seeded RNG, reproducibly', () => {
    const winners = new Set<number | null>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = { ...at(2, citizen({ id: 5 })), seed };
      const a = chooseCitizens(structuredClone(s), [fresh({ seatId: 1 }), fresh({ seatId: 2 })], new Set())[0]!.to;
      const b = chooseCitizens(structuredClone(s), [fresh({ seatId: 1 }), fresh({ seatId: 2 })], new Set())[0]!.to;
      expect(a).toBe(b);
      winners.add(a);
    }
    expect(winners).toEqual(new Set([1, 2]));
  });

  it('counts readers after citizens choose', () => {
    let s = advanceTo(soloMatch(), 'write', 1);
    s = tick(s, s.deadlineMs).state;
    const readers = s.seats.reduce((n, seat) => n + seat.readers[0]!, 0);
    expect(readers).toBe(s.citizens.filter((c) => c.paper !== null).length);
  });
});
