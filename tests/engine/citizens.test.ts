import { describe, expect, it } from 'vitest';
import { appeal, chooseCitizens } from '../../src/engine/citizens.ts';
import type { MatchState } from '../../src/engine/index.ts';
import type { Citizen, Headline } from '../../src/engine/state.ts';
import { advanceTo, makeHeadline, quietMatch, rated, soloMatch } from './helpers.ts';
import { tick } from '../../src/engine/index.ts';

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
    expect(appeal(s, citizen(), fresh({ seatId: 1 }), none)).toBe(26); // 10 + 3×0.5×4 + 50/5
    expect(appeal(s, citizen({ favorite: 'clinic' }), fresh({ seatId: 1 }), none)).toBe(19);
    expect(appeal(s, citizen(), fresh({ seatId: 1, evidence: true }), none)).toBe(34);
    expect(appeal(s, citizen({ paper: 1 }), fresh({ seatId: 1 }), none)).toBe(32);
  });

  it('drops loyalty for a paper exposed this reveal', () => {
    expect(appeal(s, citizen({ paper: 1 }), fresh({ seatId: 1 }), new Set([1]))).toBe(26);
  });

  it('penalises repeating the same location and claim, down to −20', () => {
    const repeated = (n: number) => {
      const r = at(4);
      for (let i = 1; i <= n; i++) r.headlines.push(makeHeadline({ seatId: 1, round: i, location: 'bakery', claim: 'scandal' }));
      return appeal(r, citizen(), fresh({ seatId: 1, round: 4 }), none);
    };
    expect([repeated(0), repeated(1), repeated(2), repeated(3)]).toEqual([26, 16, 6, 6]);
  });
});

describe('chooseCitizens', () => {
  const dull = (seatId: number) => fresh({ seatId, location: 'clinic', claim: 'all_clear', rating: rated(1) }); // 3 + 1×0.5×4 + trust/5

  it('subscribes an unsubscribed citizen only when the best appeal is at least 15', () => {
    const s = at(2, citizen());
    expect(chooseCitizens(s, [dull(1)], new Set())[0]!.to).toBe(1); // 15
    const t = at(2, citizen());
    t.seats[1]!.trust = 45;
    expect(chooseCitizens(t, [dull(1)], new Set())[0]!.to).toBeNull(); // 14
  });

  it('switches a subscriber only when the best beats staying (6 + trust/5 when their paper printed nothing)', () => {
    const s = at(2, citizen({ paper: 1 }));
    expect(chooseCitizens(s, [dull(2)], new Set())[0]!.to).toBe(1); // 15 < 16
    const t = at(2, citizen({ paper: 1 }));
    expect(chooseCitizens(t, [fresh({ seatId: 2, location: 'clinic' })], new Set())[0]!.to).toBe(2); // 19 > 16
    expect(t.citizens[0]!.paper).toBe(2);
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
