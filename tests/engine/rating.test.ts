import { describe, expect, it } from 'vitest';
import { applyRating } from '../../src/engine/index.ts';
import { effectiveJuiciness, fallbackRating } from '../../src/engine/rating.ts';
import type { Rating } from '../../src/shared/ai.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { makeHeadline, quietMatch, rated, withHeadline } from './helpers.ts';

describe('effectiveJuiciness', () => {
  it('averages AI juiciness with base hype, rounding half up', () => {
    expect(effectiveJuiciness('weird_sighting', rated(5))).toBe(5);
    expect(effectiveJuiciness('weird_sighting', rated(1))).toBe(3);
    expect(effectiveJuiciness('scandal', rated(4))).toBe(4); // (4+3)/2 = 3.5
    expect(effectiveJuiciness('great_deal', rated(1))).toBe(2); // (1+2)/2 = 1.5
  });
  it('drops to 1 when off-topic or inappropriate', () => {
    expect(effectiveJuiciness('danger', rated(5, { onTopic: false }))).toBe(1);
    expect(effectiveJuiciness('danger', rated(5, { inappropriate: true }))).toBe(1);
  });
  it('caps all_clear at 2', () => {
    expect(effectiveJuiciness('all_clear', rated(5))).toBe(2);
  });
});

describe('applyRating', () => {
  const unrevealed = (botAuthored = false) =>
    withHeadline(quietMatch(), { seatId: 1, round: 1, revealed: false, rating: null, botAuthored, text: 'Template text' });

  it('stores a valid rating and bumps the version', () => {
    const s = unrevealed();
    const next = applyRating(s, 'h1-1', rated(4));
    expect(next.headlines[0]!.rating).toEqual(rated(4));
    expect(next.version).toBe(s.version + 1);
  });

  it('ignores late, unknown and invalid ratings', () => {
    const revealed = withHeadline(quietMatch(), { seatId: 1, round: 1, revealed: true, rating: rated(2) });
    expect(applyRating(revealed, 'h1-1', rated(5))).toBe(revealed);
    const s = unrevealed();
    expect(applyRating(s, 'h9-9', rated(5))).toBe(s);
    const broken = { ...rated(5), juiciness: 9 } as Rating;
    expect(applyRating(s, 'h1-1', broken)).toBe(s);
  });

  it('replaces text only for bot-authored headlines and only with valid text', () => {
    expect(applyRating(unrevealed(true), 'h1-1', rated(3), 'AI scoop').headlines[0]!.text).toBe('AI scoop');
    expect(applyRating(unrevealed(false), 'h1-1', rated(3), 'AI scoop').headlines[0]!.text).toBe('Template text');
    expect(applyRating(unrevealed(true), 'h1-1', rated(3), '   ').headlines[0]!.text).toBe('Template text');
  });
});

describe('fallbackRating', () => {
  const s = quietMatch();
  it('uses base hype for humans and personality juice for bots', () => {
    expect(fallbackRating(s, makeHeadline({ seatId: 0, round: 1, claim: 'danger' })).juiciness).toBe(4);
    expect(fallbackRating(s, makeHeadline({ seatId: 1, round: 1, claim: 'all_clear', authorPersonality: 'tabloid' })).juiciness).toBe(4);
    expect(fallbackRating(s, makeHeadline({ seatId: 1, round: 1, authorPersonality: 'gazette' })).juiciness).toBe(2);
    for (let r = 1; r <= 5; r++) {
      const j = fallbackRating(s, makeHeadline({ seatId: 1, round: r, authorPersonality: 'wildcard' })).juiciness;
      expect(j).toBeGreaterThanOrEqual(1);
      expect(j).toBeLessThanOrEqual(5);
    }
  });
  it('takes two template bubbles for the claim', () => {
    const r = fallbackRating(s, makeHeadline({ seatId: 0, round: 1, claim: 'scandal' }));
    expect(r.bubbles).toHaveLength(2);
    for (const b of r.bubbles) expect(SAMPLE_CONTENT.bubbles.scandal).toContain(b);
    expect(r).toMatchObject({ onTopic: true, inappropriate: false });
  });
});
