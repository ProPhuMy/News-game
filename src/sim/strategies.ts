import { hottestClaim, rivalHeadlines, todaysCard, type InvestigateDecision, type WriteDecision } from '../bots/personalities.ts';
import type { Rng } from '../engine/rng.ts';
import type { PrivateSnapshot, PublicSnapshot } from '../shared/snapshots.ts';

/** A sim-only player policy. Sees exactly what a human client sees. */
export interface Strategy {
  name: string;
  investigate(pub: PublicSnapshot, priv: PrivateSnapshot, rng: Rng): InvestigateDecision;
  write(pub: PublicSnapshot, priv: PrivateSnapshot, rng: Rng): WriteDecision;
}

const checkTip = (priv: PrivateSnapshot): InvestigateDecision =>
  priv.tip ? { kind: 'investigate', target: { kind: 'location', location: priv.tip.location } } : { kind: 'skip' };

function truthful(pub: PublicSnapshot, priv: PrivateSnapshot): WriteDecision {
  const card = todaysCard(pub, priv);
  if (card) return { kind: 'lock', story: { kind: 'claim', location: card.location, claim: card.claim, attachEvidence: true } };
  return priv.tip ? { kind: 'lock', story: { kind: 'claim', location: priv.tip.location, claim: 'all_clear', attachEvidence: false } } : { kind: 'skip' };
}

function lie(pub: PublicSnapshot, priv: PrivateSnapshot): WriteDecision {
  const card = todaysCard(pub, priv);
  if (card) return { kind: 'lock', story: { kind: 'claim', location: card.location, claim: hottestClaim(card.claim), attachEvidence: false } };
  return priv.tip ? { kind: 'lock', story: { kind: 'claim', location: priv.tip.location, claim: priv.tip.claim, attachEvidence: false } } : { kind: 'skip' };
}

/** Always checks its tip and prints the evidenced truth. */
export const HONEST: Strategy = { name: 'honest', investigate: (_pub, priv) => checkTip(priv), write: truthful };

/** Always checks its tip, then prints the juiciest claim it knows is false. */
export const LIAR: Strategy = { name: 'liar', investigate: (_pub, priv) => checkTip(priv), write: lie };

/** Hunts rivals half the time from round 2, exposes when it can, lies half the time. */
export const MIXED: Strategy = {
  name: 'mixed',
  investigate: (pub, priv, rng) => {
    const rivals = rivalHeadlines(pub, priv);
    return rivals.length > 0 && rng.chance(0.5)
      ? { kind: 'investigate', target: { kind: 'headline', headlineId: rng.pick(rivals).id } }
      : checkTip(priv);
  },
  write: (pub, priv, rng) => {
    const proof = priv.proofs[0];
    if (proof) return { kind: 'lock', story: { kind: 'expose', headlineId: proof.headlineId } };
    return rng.chance(0.5) ? lie(pub, priv) : truthful(pub, priv);
  },
};
