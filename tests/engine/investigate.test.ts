import { describe, expect, it } from 'vitest';
import { applyCommand, privateView, type MatchState } from '../../src/engine/index.ts';
import type { TownEvent } from '../../src/engine/state.ts';
import type { Location } from '../../src/shared/ids.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { advanceTo, checkLocation, investigateHeadline, quietMatch, run, withHeadline } from './helpers.ts';

const BAKERY: TownEvent = { templateId: 'bakery_truck', location: 'bakery', claim: 'health_scare', real: true };
const bakeryTemplate = SAMPLE_CONTENT.eventTemplates[0]!;

function round1(events: TownEvent[]): MatchState {
  const s = structuredClone(advanceTo(quietMatch(), 'investigate', 1));
  s.events[1] = events;
  return s;
}

/** Round 2 investigate with a rival (seat 1) headline from round 1 and seat 0's tip moved to `tipAt`. */
function round2(seed: number, isTrue: boolean, tipAt: Location): MatchState {
  const s = withHeadline(advanceTo(quietMatch(seed), 'investigate', 2), { seatId: 1, round: 1, location: 'bank', isTrue });
  s.seats[0]!.tip = { ...s.seats[0]!.tip!, location: tipAt };
  return s;
}

const outcome = (s: MatchState) => privateView(s, 0).investigations.at(-1)?.outcome;

describe('checking a location', () => {
  it('gives a certain evidence card for a real event', () => {
    const s0 = round1([BAKERY]);
    const s = run(s0, 0, checkLocation(s0, 'bakery'));
    expect(privateView(s, 0).evidence).toEqual([{ round: 1, location: 'bakery', claim: 'health_scare', text: bakeryTemplate.evidenceReal }]);
    expect(outcome(s)).toBe('evidence');
  });

  it('shows all_clear for an innocent event or a quiet location', () => {
    const s0 = round1([{ ...BAKERY, real: false }]);
    const a = run(s0, 0, checkLocation(s0, 'bakery'));
    expect(privateView(a, 0).evidence[0]).toMatchObject({ claim: 'all_clear', text: bakeryTemplate.evidenceInnocent });
    const b = run(s0, 0, checkLocation(s0, 'clinic'));
    expect(privateView(b, 0).evidence[0]).toMatchObject({ claim: 'all_clear', text: SAMPLE_CONTENT.quietDays.clinic.evidence });
  });
});

describe('investigating a rival headline', () => {
  it('is unavailable in round 1', () => {
    const s = withHeadline(round1([BAKERY]), { seatId: 1, round: 1 });
    expect(applyCommand(s, 0, investigateHeadline(s, 'h1-1'), 0).result).toEqual({ ok: false, error: 'BAD_TARGET' });
  });

  it('rejects own, exposed, current-round and unknown headlines', () => {
    const base = advanceTo(quietMatch(), 'investigate', 2);
    const own = withHeadline(base, { seatId: 0, round: 1 });
    const exposed = withHeadline(base, { seatId: 1, round: 1, exposedRound: 1 });
    const current = withHeadline(base, { seatId: 1, round: 2 });
    for (const [s, id] of [[own, 'h1-0'], [exposed, 'h1-1'], [current, 'h2-1'], [base, 'h1-3']] as const) {
      expect(applyCommand(s, 0, investigateHeadline(s, id), 0).result).toEqual({ ok: false, error: 'BAD_TARGET' });
    }
  });

  it('finds proof of a lie about 60% of the time, 85% when the tip points there', () => {
    const rate = (tipAt: Location) => {
      let found = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const s0 = round2(seed, false, tipAt);
        if (outcome(run(s0, 0, investigateHeadline(s0, 'h1-1'))) === 'proof') found++;
      }
      return found / 400;
    };
    expect(rate('clinic')).toBeGreaterThan(0.5);
    expect(rate('clinic')).toBeLessThan(0.7);
    expect(rate('bank')).toBeGreaterThan(0.77);
    expect(rate('bank')).toBeLessThan(0.93);
  });

  it('never finds proof against a true headline and adds a proof card only on success', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const s0 = round2(seed, true, 'bank');
      const s = run(s0, 0, investigateHeadline(s0, 'h1-1'));
      expect(outcome(s)).toBe('nothing');
      expect(privateView(s, 0).proofs).toEqual([]);
    }
  });
});
