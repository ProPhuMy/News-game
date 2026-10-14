import { describe, expect, it } from 'vitest';
import { decideInvestigate, decideWrite, hottestClaim } from '../../src/bots/personalities.ts';
import { privateView, publicView } from '../../src/engine/index.ts';
import { stream } from '../../src/engine/rng.ts';
import { PERSONALITIES } from '../../src/shared/ids.ts';
import { InvestigateTargetSchema, StorySchema } from '../../src/shared/protocol.ts';
import type { HeadlinePublic, PrivateSnapshot, PublicSnapshot } from '../../src/shared/snapshots.ts';
import { advanceTo, fakeRng, quietMatch } from '../engine/helpers.ts';

const YES = () => fakeRng(0);
const NO = () => fakeRng(0.99);

function views(round: number): { pub: PublicSnapshot; priv: PrivateSnapshot } {
  const s = advanceTo(quietMatch(), 'investigate', round);
  const pub = publicView(s);
  const priv = privateView(s, 1);
  priv.tip = { round, location: 'bakery', claim: 'health_scare', text: 'tip' };
  return { pub, priv };
}
const pubHeadline = (over: Partial<HeadlinePublic> & Pick<HeadlinePublic, 'id' | 'seatId' | 'round'>): HeadlinePublic => ({
  location: 'bank', claim: 'scandal', exposeOf: null, text: 't', pulled: false, evidence: false, exposed: false, truth: 'unknown', ...over,
});

describe('Tabloid', () => {
  it('investigates a rival 30% of the time from round 2', () => {
    const r1 = views(1);
    expect(decideInvestigate('tabloid', r1.pub, r1.priv, YES())).toEqual({ kind: 'skip' });
    const r2 = views(2);
    r2.pub.headlines = [pubHeadline({ id: 'h1-2', seatId: 2, round: 1 })];
    expect(decideInvestigate('tabloid', r2.pub, r2.priv, YES())).toEqual({ kind: 'investigate', target: { kind: 'headline', headlineId: 'h1-2' } });
    expect(decideInvestigate('tabloid', r2.pub, r2.priv, NO())).toEqual({ kind: 'skip' });
  });

  it('exposes with proof, else prints its tip claim or the hottest claim', () => {
    const { pub, priv } = views(2);
    expect(decideWrite('tabloid', pub, priv, NO())).toEqual({ kind: 'lock', story: { kind: 'claim', location: 'bakery', claim: 'health_scare', attachEvidence: false } });
    expect(decideWrite('tabloid', pub, priv, YES())).toEqual({ kind: 'lock', story: { kind: 'claim', location: 'bakery', claim: 'weird_sighting', attachEvidence: false } });
    priv.proofs = [{ headlineId: 'h1-3', round: 2 }];
    expect(decideWrite('tabloid', pub, priv, NO())).toEqual({ kind: 'lock', story: { kind: 'expose', headlineId: 'h1-3' } });
  });
});

describe('Gazette', () => {
  it('checks its tip location in round 1', () => {
    const { pub, priv } = views(1);
    expect(decideInvestigate('gazette', pub, priv, YES())).toEqual({ kind: 'investigate', target: { kind: 'location', location: 'bakery' } });
  });

  it('half the time investigates the latest headline of the lowest-trust rival', () => {
    const { pub, priv } = views(3);
    pub.papers[2]!.trust = 30;
    pub.headlines = [
      pubHeadline({ id: 'h1-2', seatId: 2, round: 1 }), pubHeadline({ id: 'h2-2', seatId: 2, round: 2 }),
      pubHeadline({ id: 'h2-3', seatId: 3, round: 2 }),
    ];
    expect(decideInvestigate('gazette', pub, priv, YES())).toEqual({ kind: 'investigate', target: { kind: 'headline', headlineId: 'h2-2' } });
    expect(decideInvestigate('gazette', pub, priv, NO())).toEqual({ kind: 'investigate', target: { kind: 'location', location: 'bakery' } });
  });

  it('prints what its evidence shows, with the card; lies 10% of the time', () => {
    const { pub, priv } = views(2);
    priv.evidence = [{ round: 2, location: 'bakery', claim: 'health_scare', text: 'x' }];
    expect(decideWrite('gazette', pub, priv, NO())).toEqual({ kind: 'lock', story: { kind: 'claim', location: 'bakery', claim: 'health_scare', attachEvidence: true } });
    expect(decideWrite('gazette', pub, priv, YES())).toEqual({ kind: 'lock', story: { kind: 'claim', location: 'bakery', claim: 'weird_sighting', attachEvidence: false } });
    priv.evidence = [{ round: 2, location: 'bakery', claim: 'all_clear', text: 'x' }];
    expect(decideWrite('gazette', pub, priv, NO())).toEqual({ kind: 'lock', story: { kind: 'claim', location: 'bakery', claim: 'all_clear', attachEvidence: true } });
    priv.evidence = [];
    expect(decideWrite('gazette', pub, priv, NO())).toEqual({ kind: 'skip' });
  });
});

describe('Wildcard', () => {
  it('exposes half the time when it holds proof', () => {
    const { pub, priv } = views(2);
    priv.proofs = [{ headlineId: 'h1-3', round: 2 }];
    expect(decideWrite('wildcard', pub, priv, YES())).toEqual({ kind: 'lock', story: { kind: 'expose', headlineId: 'h1-3' } });
    expect(decideWrite('wildcard', pub, priv, NO()).kind).toBe('lock');
  });

  it('attaches evidence only when its card matches the random story', () => {
    const { pub, priv } = views(2);
    priv.evidence = [{ round: 2, location: 'bakery', claim: 'danger', text: 'x' }];
    expect(decideWrite('wildcard', pub, priv, fakeRng(0, 0))).toEqual({ kind: 'lock', story: { kind: 'claim', location: 'bakery', claim: 'danger', attachEvidence: true } });
  });
});

describe('every personality', () => {
  it('only ever makes valid decisions', () => {
    for (const p of PERSONALITIES) {
      for (let seed = 1; seed <= 100; seed++) {
        const { pub, priv } = views(2);
        pub.headlines = [pubHeadline({ id: 'h1-2', seatId: 2, round: 1 })];
        const inv = decideInvestigate(p, pub, priv, stream(seed, p, 'inv'));
        if (inv.kind === 'investigate') InvestigateTargetSchema.parse(inv.target);
        const w = decideWrite(p, pub, priv, stream(seed, p, 'write'));
        if (w.kind === 'lock') StorySchema.parse(w.story);
      }
    }
  });

  it('knows the hottest claim', () => {
    expect(hottestClaim()).toBe('weird_sighting');
    expect(hottestClaim('weird_sighting')).toBe('danger');
  });
});
