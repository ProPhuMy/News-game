import type { Rng } from '../engine/rng.ts';
import { LOCATIONS, TOWN_CLAIMS, type Location, type Personality, type TownClaim } from '../shared/ids.ts';
import type { InvestigateTarget, Story } from '../shared/protocol.ts';
import type { EvidenceCard, HeadlinePublic, PrivateSnapshot, PublicSnapshot } from '../shared/snapshots.ts';
import { TUNING } from '../shared/tuning.ts';

export type InvestigateDecision = { kind: 'skip' } | { kind: 'investigate'; target: InvestigateTarget };
export type WriteDecision = { kind: 'skip' } | { kind: 'lock'; story: Story };

/** Unexposed headlines rivals published in earlier rounds. */
export function rivalHeadlines(pub: PublicSnapshot, priv: PrivateSnapshot): HeadlinePublic[] {
  return pub.headlines.filter((h) => h.seatId !== priv.seatId && !h.exposed && h.round < pub.round);
}

export const todaysCard = (pub: PublicSnapshot, priv: PrivateSnapshot): EvidenceCard | undefined =>
  priv.evidence.find((c) => c.round === pub.round);

/** Highest base-hype town claim, optionally skipping one. Ties go to the earlier claim in TOWN_CLAIMS. */
export function hottestClaim(exclude?: TownClaim): TownClaim {
  return TOWN_CLAIMS.filter((c) => c !== exclude).reduce((a, b) => (TUNING.baseHype[b] > TUNING.baseHype[a] ? b : a));
}

const check = (location: Location): InvestigateDecision => ({ kind: 'investigate', target: { kind: 'location', location } });
const probe = (headlineId: string): InvestigateDecision => ({ kind: 'investigate', target: { kind: 'headline', headlineId } });
const claim = (location: Location, c: TownClaim, attachEvidence = false): WriteDecision =>
  ({ kind: 'lock', story: { kind: 'claim', location, claim: c, attachEvidence } });
const exposeWith = (priv: PrivateSnapshot): WriteDecision | null => {
  const proof = priv.proofs[0];
  return proof ? { kind: 'lock', story: { kind: 'expose', headlineId: proof.headlineId } } : null;
};

function weakestRivalHeadline(pub: PublicSnapshot, rivals: HeadlinePublic[]): HeadlinePublic | null {
  if (rivals.length === 0) return null;
  const trust = (seatId: number) => pub.papers[seatId]!.trust;
  const lowest = Math.min(...rivals.map((h) => trust(h.seatId)));
  return rivals.filter((h) => trust(h.seatId) === lowest).reduce((a, b) => (b.round > a.round || (b.round === a.round && b.id > a.id) ? b : a));
}

export function decideInvestigate(personality: Personality, pub: PublicSnapshot, priv: PrivateSnapshot, rng: Rng): InvestigateDecision {
  const rivals = rivalHeadlines(pub, priv);
  switch (personality) {
    case 'tabloid':
      return rivals.length > 0 && rng.chance(TUNING.bots.tabloidInvestigate) ? probe(rng.pick(rivals).id) : { kind: 'skip' };
    case 'gazette': {
      const target = rng.chance(TUNING.bots.gazetteInvestigateRival) ? weakestRivalHeadline(pub, rivals) : null;
      if (target) return probe(target.id);
      return priv.tip ? check(priv.tip.location) : { kind: 'skip' };
    }
    case 'wildcard': {
      const options: InvestigateDecision[] = [...LOCATIONS.map(check), ...rivals.map((h) => probe(h.id)), { kind: 'skip' }];
      return rng.pick(options);
    }
  }
}

/** `caretaker`: the Caretaker plays Gazette rules but keeps the pre-C1.5 no-evidence skip (user decision, 2026-10-19). */
export function decideWrite(personality: Personality, pub: PublicSnapshot, priv: PrivateSnapshot, rng: Rng,
  { caretaker = false } = {}): WriteDecision {
  const card = todaysCard(pub, priv);
  const tip = priv.tip;
  switch (personality) {
    case 'tabloid': {
      const expose = exposeWith(priv);
      if (expose) return expose;
      if (!tip) return claim(rng.pick(LOCATIONS), hottestClaim());
      return claim(tip.location, rng.chance(TUNING.bots.tabloidHighHype) ? hottestClaim() : tip.claim);
    }
    case 'gazette': {
      const expose = exposeWith(priv);
      if (expose) return expose;
      const lie = rng.chance(TUNING.bots.gazetteLie);
      if (card) return lie ? claim(card.location, hottestClaim(card.claim)) : claim(card.location, card.claim, true);
      // No evidence card (it probed a rival and found no proof): the Caretaker sits out unless the lie roll prints the tip claim;
      // the Gazette prints its tip story, lying 10% of the time. Either skips with no tip.
      if (!tip) return { kind: 'skip' };
      if (caretaker) return lie ? claim(tip.location, tip.claim) : { kind: 'skip' };
      return claim(tip.location, lie ? hottestClaim(tip.claim) : tip.claim);
    }
    case 'wildcard': {
      const expose = exposeWith(priv);
      if (expose && rng.chance(TUNING.bots.wildcardExpose)) return expose;
      const location = rng.pick(LOCATIONS);
      const c = rng.pick(TOWN_CLAIMS);
      return claim(location, c, card?.location === location && card.claim === c);
    }
  }
}
