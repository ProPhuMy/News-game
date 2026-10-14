import { describe, expect, it } from 'vitest';
import { tick, type MatchState } from '../../src/engine/index.ts';
import { townChance } from '../../src/engine/resolve.ts';
import type { TownEvent } from '../../src/engine/state.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { TUNING } from '../../src/shared/tuning.ts';

const x = TUNING.townExposure;
const chance = (juice: number, survived: number) => x.base + x.perJuice * juice + x.perRoundSurvived * survived;
const penalty = (juice: number) => TUNING.trust.exposedBase + TUNING.trust.exposedPerJuice * juice;
import { advanceTo, checkLocation, lockClaim, lockExpose, makeHeadline, quietMatch, rated, run, withHeadline } from './helpers.ts';

const reveal = (s: MatchState) => tick(s, s.deadlineMs).state;

describe('townChance', () => {
  it('follows base + perJuice × juice + perRoundSurvived × rounds survived', () => {
    expect(townChance(makeHeadline({ seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) }), 2)).toBeCloseTo(chance(5, 0));
    expect(townChance(makeHeadline({ seatId: 1, round: 1, rating: rated(5, { onTopic: false }) }), 2)).toBeCloseTo(chance(1, 0));
    expect(townChance(makeHeadline({ seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) }), 4)).toBeCloseTo(chance(5, 2));
  });
  it('multiplies in the Final Edition, capped', () => {
    expect(townChance(makeHeadline({ seatId: 1, round: 5, rating: rated(5, { onTopic: false }) }), 6, true)).toBeCloseTo(Math.min(chance(1, 0) * x.finalMultiplier, x.finalCap));
    expect(townChance(makeHeadline({ seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) }), 6, true)).toBeCloseTo(Math.min(chance(5, 4) * x.finalMultiplier, x.finalCap));
  });
});

/** Round 2 write with seat 1's round-1 lie (weird_sighting, juice 5) and proof for the given seats. */
function exposeSetup(s0: MatchState, provers: number[]): MatchState {
  const s = withHeadline(advanceTo(s0, 'write', 2), { seatId: 1, round: 1, location: 'bank', claim: 'weird_sighting', rating: rated(5) });
  for (const seatId of provers) s.seats[seatId]!.proofs.push({ headlineId: 'h1-1', round: 2 });
  return s;
}

describe('revealRound', () => {
  it('applies a player expose: −(exposedBase + exposedPerJuice × juice) to the liar, exposeBonus to the exposer', () => {
    let s = exposeSetup(quietMatch(), [0]);
    s = reveal(run(s, 0, lockExpose(s, 'h1-1')));
    expect(s.seats[1]!.trust).toBe(50 - penalty(5));
    expect(s.seats[0]!.trust).toBe(50 + TUNING.trust.exposeBonus);
    expect(s.exposures).toEqual([expect.objectContaining({ headlineId: 'h1-1', source: 'player', exposers: [0], trustDelta: -penalty(5) })]);
    expect(s.headlines.find((h) => h.id === 'h1-1')!.exposedRound).toBe(2);
  });

  it('charges the liar once when two papers expose the same lie', () => {
    let s = exposeSetup(quietMatch(), [0, 2]);
    s = run(run(s, 0, lockExpose(s, 'h1-1')), 2, lockExpose(s, 'h1-1'));
    s = reveal(s);
    expect(s.seats[1]!.trust).toBe(50 - penalty(5));
    expect([s.seats[0]!.trust, s.seats[2]!.trust]).toEqual([50 + TUNING.trust.exposeBonus, 50 + TUNING.trust.exposeBonus]);
    expect(s.exposures.filter((e) => e.headlineId === 'h1-1')).toHaveLength(1);
  });

  it('rolls town exposure for earlier lies at about the computed chance', () => {
    let exposed = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = withHeadline(advanceTo(quietMatch(seed), 'write', 2), { seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) });
      if (reveal(s).exposures.some((e) => e.headlineId === 'h1-1' && e.source === 'town')) exposed++;
    }
    expect(exposed / 400).toBeGreaterThan(chance(5, 0) - 0.07);
    expect(exposed / 400).toBeLessThan(chance(5, 0) + 0.07);
  });

  it('never rolls this round\'s new lies and uses the event explanation', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = advanceTo(quietMatch(seed), 'write', 1);
      expect(reveal(run(s, 0, lockClaim(s, 'clinic', 'weird_sighting'))).exposures).toEqual([]);
    }
    const s = structuredClone(withHeadline(advanceTo(quietMatch(), 'write', 2), { seatId: 1, round: 1, location: 'bakery', rating: rated(5) }));
    const event: TownEvent = { templateId: 'bakery_truck', location: 'bakery', claim: 'health_scare', real: false };
    s.events[1] = [event];
    s.seats[0]!.proofs.push({ headlineId: 'h1-1', round: 2 });
    const done = reveal(run(s, 0, lockExpose(s, 'h1-1')));
    expect(done.exposures[0]!.explanation).toBe(SAMPLE_CONTENT.eventTemplates[0]!.explanationInnocent);
  });

  it('gives evidenceBonus at reveal and clamps trust to 0–100', () => {
    let s = structuredClone(advanceTo(quietMatch(), 'investigate', 1));
    s.events[1] = [];
    s = advanceTo(run(s, 0, checkLocation(s, 'clinic')), 'write', 1);
    expect(reveal(run(s, 0, lockClaim(s, 'clinic', 'all_clear', true))).seats[0]!.trust).toBe(50 + TUNING.trust.evidenceBonus);

    let c = structuredClone(exposeSetup(quietMatch(), [0]));
    c.seats[1]!.trust = 5;
    c.seats[0]!.trust = 98;
    c = reveal(run(c, 0, lockExpose(c, 'h1-1')));
    expect([c.seats[0]!.trust, c.seats[1]!.trust]).toEqual([100, 0]);
  });

  it('rates every unrated headline with the fallback and reveals it', () => {
    const s = advanceTo(quietMatch(), 'write', 1);
    const done = reveal(run(s, 0, lockClaim(s, 'bank', 'scandal')));
    expect(done.headlines[0]).toMatchObject({ revealed: true, rating: expect.objectContaining({ juiciness: 3 }) });
    expect(done.seats.every((seat) => seat.readers.length === 1)).toBe(true);
  });
});

describe('revealRound, all steps together', () => {
  /** Round 2 write: seat 0 exposes seat 1's lie; seat 2's old lie may be town-exposed; seat 3 prints a true story with evidence. */
  function scenario(seed: number): MatchState {
    let s = withHeadline(advanceTo(quietMatch(seed), 'write', 2), { seatId: 1, round: 1, location: 'bank', claim: 'weird_sighting', rating: rated(5) });
    s = withHeadline(s, { seatId: 2, round: 1, location: 'clinic', claim: 'weird_sighting', rating: rated(5) });
    s.events[2] = [];
    s.seats[0]!.proofs.push({ headlineId: 'h1-1', round: 2 });
    s.seats[1]!.trust = 2; // the exposure must clamp at 0, not go negative
    s.seats[3]!.trust = 99; // the evidence bonus must clamp at 100
    s.seats[3]!.evidence.push({ round: 2, location: 'bakery', claim: 'all_clear', text: 'x' });
    s.citizens.forEach((c, i) => { c.paper = i % 2 === 0 ? 1 : null; });
    s = run(s, 0, lockExpose(s, 'h1-1'));
    s = run(s, 3, lockClaim(s, 'bakery', 'all_clear', true));
    return tick(s, s.deadlineMs).state;
  }

  it('applies player exposes, town rolls, evidence, clamping and loyalty loss in order', () => {
    const seed = Array.from({ length: 400 }, (_, i) => i + 1).find((n) => scenario(n).exposures.some((e) => e.source === 'town'));
    expect(seed).toBeDefined();
    const s = scenario(seed!);
    expect(s.exposures.map((e) => [e.headlineId, e.source])).toEqual([['h1-1', 'player'], ['h1-2', 'town']]);
    expect(s.seats.map((seat) => seat.trust)).toEqual([
      50 + TUNING.trust.exposeBonus,
      0,
      50 - penalty(5),
      100,
    ]);
    const plan = s.reactionPlan!;
    const leftExposed = plan.citizens.filter((c) => c.fromPaper === 1 && c.toPaper !== 1);
    expect(leftExposed.length).toBeGreaterThan(0);
    for (const c of leftExposed) expect(c.behavior).toBe('angry_mob');
  });
});
