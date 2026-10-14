import { describe, expect, it } from 'vitest';
import { tick, type MatchState } from '../../src/engine/index.ts';
import { townChance } from '../../src/engine/resolve.ts';
import type { TownEvent } from '../../src/engine/state.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { advanceTo, checkLocation, lockClaim, lockExpose, makeHeadline, quietMatch, rated, run, withHeadline } from './helpers.ts';

const reveal = (s: MatchState) => tick(s, s.deadlineMs).state;

describe('townChance', () => {
  it('follows 5% + 5% × juice + 10% × rounds survived', () => {
    expect(townChance(makeHeadline({ seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) }), 2)).toBeCloseTo(0.3);
    expect(townChance(makeHeadline({ seatId: 1, round: 1, rating: rated(5, { onTopic: false }) }), 2)).toBeCloseTo(0.1);
    expect(townChance(makeHeadline({ seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) }), 4)).toBeCloseTo(0.5);
  });
  it('doubles in the Final Edition, capped at 90%', () => {
    expect(townChance(makeHeadline({ seatId: 1, round: 5, rating: rated(5, { onTopic: false }) }), 6, true)).toBeCloseTo(0.2);
    expect(townChance(makeHeadline({ seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) }), 6, true)).toBeCloseTo(0.9);
  });
});

/** Round 2 write with seat 1's round-1 lie (weird_sighting, juice 5) and proof for the given seats. */
function exposeSetup(s0: MatchState, provers: number[]): MatchState {
  const s = withHeadline(advanceTo(s0, 'write', 2), { seatId: 1, round: 1, location: 'bank', claim: 'weird_sighting', rating: rated(5) });
  for (const seatId of provers) s.seats[seatId]!.proofs.push({ headlineId: 'h1-1', round: 2 });
  return s;
}

describe('revealRound', () => {
  it('applies a player expose: −(10 + 2 × juice) to the liar, +8 to the exposer', () => {
    let s = exposeSetup(quietMatch(), [0]);
    s = reveal(run(s, 0, lockExpose(s, 'h1-1')));
    expect(s.seats[1]!.trust).toBe(30);
    expect(s.seats[0]!.trust).toBe(58);
    expect(s.exposures).toEqual([expect.objectContaining({ headlineId: 'h1-1', source: 'player', exposers: [0], trustDelta: -20 })]);
    expect(s.headlines.find((h) => h.id === 'h1-1')!.exposedRound).toBe(2);
  });

  it('charges the liar once when two papers expose the same lie', () => {
    let s = exposeSetup(quietMatch(), [0, 2]);
    s = run(run(s, 0, lockExpose(s, 'h1-1')), 2, lockExpose(s, 'h1-1'));
    s = reveal(s);
    expect(s.seats[1]!.trust).toBe(30);
    expect([s.seats[0]!.trust, s.seats[2]!.trust]).toEqual([58, 58]);
    expect(s.exposures.filter((e) => e.headlineId === 'h1-1')).toHaveLength(1);
  });

  it('rolls town exposure for earlier lies at about the computed chance', () => {
    let exposed = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = withHeadline(advanceTo(quietMatch(seed), 'write', 2), { seatId: 1, round: 1, claim: 'weird_sighting', rating: rated(5) });
      if (reveal(s).exposures.some((e) => e.headlineId === 'h1-1' && e.source === 'town')) exposed++;
    }
    expect(exposed / 400).toBeGreaterThan(0.22);
    expect(exposed / 400).toBeLessThan(0.38);
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

  it('gives +6 for evidence at reveal and clamps trust to 0–100', () => {
    let s = structuredClone(advanceTo(quietMatch(), 'investigate', 1));
    s.events[1] = [];
    s = advanceTo(run(s, 0, checkLocation(s, 'clinic')), 'write', 1);
    expect(reveal(run(s, 0, lockClaim(s, 'clinic', 'all_clear', true))).seats[0]!.trust).toBe(56);

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
