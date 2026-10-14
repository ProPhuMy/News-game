import { describe, expect, it } from 'vitest';
import { finishMatch } from '../../src/engine/final.ts';
import { publicView, tick, type MatchState } from '../../src/engine/index.ts';
import { scoreOf } from '../../src/engine/score.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { makeHeadline, quietMatch, rated, soloMatch } from './helpers.ts';

function round5(): MatchState {
  const s = structuredClone(quietMatch());
  s.round = 5;
  s.phase = 'reveal';
  return s;
}

describe('finishMatch', () => {
  it('gives +2 per true claim headline without evidence (not exposes, not evidenced)', () => {
    const s = round5();
    s.headlines = [
      makeHeadline({ seatId: 0, round: 1, isTrue: true }),
      makeHeadline({ seatId: 0, round: 2, isTrue: true }),
      makeHeadline({ seatId: 0, round: 3, isTrue: true, evidence: true }),
      makeHeadline({ seatId: 0, round: 4, isTrue: true, claim: 'expose', exposeOf: 'h1-1' }),
      makeHeadline({ seatId: 0, round: 5, isTrue: false, exposedRound: 5 }),
    ];
    finishMatch(s);
    expect(s.final!.trustBonuses.find((b) => b.seatId === 0)!.amount).toBe(4);
    expect(s.seats[0]!.trust).toBe(54);
  });

  it('rolls every hidden lie at the Final Edition multiplier', () => {
    let exposed = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = { ...round5(), seed };
      s.headlines = [makeHeadline({ seatId: 1, round: 5, rating: rated(5, { onTopic: false }) })]; // effective juice 1, survived 0
      finishMatch(s);
      if (s.final!.exposures.length > 0) exposed++;
    }
    const x = TUNING.townExposure;
    const p = Math.min((x.base + x.perJuice) * x.finalMultiplier, x.finalCap);
    expect(Math.abs(exposed / 400 - p)).toBeLessThan(0.05);
  });

  it('records lies told, caught and escaped', () => {
    const s = round5();
    s.headlines = [
      makeHeadline({ seatId: 2, round: 1, exposedRound: 2 }),
      makeHeadline({ seatId: 2, round: 2, isTrue: true }),
    ];
    finishMatch(s);
    expect(s.final!.records.find((r) => r.seatId === 2)).toEqual({ seatId: 2, liesTold: 1, liesCaught: 1, liesEscaped: 0 });
  });

  it('scores readers × trust / 50 and shares the win on equal scores', () => {
    const s = round5();
    s.seats.forEach((seat) => { seat.readers = [1]; seat.trust = 50; });
    s.seats[0]!.readers = [3, 4];
    s.seats[0]!.trust = 75;
    expect(scoreOf(s.seats[0]!)).toBe(11); // 7 × 75 / 50 = 10.5
    s.seats[1]!.readers = [11];
    finishMatch(s);
    expect(s.final!.winners).toEqual([0, 1]);
  });

  it('reveals every headline\'s truth in the Final Edition', () => {
    let s = soloMatch(3);
    while (s.phase !== 'final') s = tick(s, s.deadlineMs).state;
    expect(publicView(s).headlines.every((h) => h.truth !== 'unknown')).toBe(true);
    expect(s.final).not.toBeNull();
  });
});
