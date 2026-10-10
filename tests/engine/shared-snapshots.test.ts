import { describe, expect, it } from 'vitest';
import { RatingSchema } from '../../src/shared/ai.ts';
import { PrivateSnapshotSchema, ReactionPlanSchema } from '../../src/shared/snapshots.ts';

describe('snapshot schemas', () => {
  it('accepts a minimal reaction plan', () => {
    expect(ReactionPlanSchema.parse({
      round: 1,
      exposures: [],
      citizens: [{ citizenId: 0, behavior: 'queue', route: ['r0c1', 'r1c1'], fromPaper: null, toPaper: 2, bubble: 'Bargain!' }],
      recap: { headlineId: 'h1-2', location: 'bakery', behavior: 'queue', reactors: 1, gainSeatId: 2, gained: 1 },
    }).citizens).toHaveLength(1);
  });

  it('rejects a reaction entry with an empty route', () => {
    expect(ReactionPlanSchema.safeParse({
      round: 1, exposures: [],
      citizens: [{ citizenId: 0, behavior: 'routine', route: [], fromPaper: null, toPaper: null, bubble: null }],
      recap: { headlineId: null, location: null, behavior: 'routine', reactors: 0, gainSeatId: null, gained: 0 },
    }).success).toBe(false);
  });

  it('has no field for hidden truth or gullibility in private snapshots', () => {
    const keys = Object.keys(PrivateSnapshotSchema.shape);
    expect(keys).not.toContain('gullibility');
    expect(keys).not.toContain('events');
  });

  it('clamps AI ratings to 1–5 and 2–3 bubbles of ≤ 60 chars', () => {
    const ok = { juiciness: 3, onTopic: true, inappropriate: false, bubbles: ['a', 'b'] };
    expect(RatingSchema.safeParse(ok).success).toBe(true);
    expect(RatingSchema.safeParse({ ...ok, juiciness: 9 }).success).toBe(false);
    expect(RatingSchema.safeParse({ ...ok, bubbles: ['a'] }).success).toBe(false);
    expect(RatingSchema.safeParse({ ...ok, bubbles: ['a', 'x'.repeat(61)] }).success).toBe(false);
  });
});
