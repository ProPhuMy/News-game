import { describe, expect, it } from 'vitest';
import fixtureJson from '../../src/sim/fixtures/solo-honest.json' with { type: 'json' };
import { checkRun, parsePlayback, rebasePublic, summarizePlan } from '../../src/client/visual-test/realtime.ts';
import { parseFixture, selectFrameIndex } from '../../src/client/visual-test/scenario.ts';

const fixture = parseFixture(fixtureJson);
const reveal = fixture.frames[selectFrameIndex(fixture, 3, 'reveal')]!;

describe('parsePlayback', () => {
  it('defaults to screenshot mode and accepts realtime', () => {
    expect(parsePlayback('')).toBe('screenshot');
    expect(parsePlayback('?playback=realtime')).toBe('realtime');
    expect(() => parsePlayback('?playback=live')).toThrow(/playback must be screenshot or realtime, got "live"/);
  });
});

describe('solo-honest round 3 reveal', () => {
  it('is the requested busy scene: 20 s, 30 travelling actors, 26 at r0c4 and 4 at r1c3', () => {
    expect(reveal.public.deadlineMs - reveal.atMs).toBe(20_000);
    expect(summarizePlan(reveal.public.reactionPlan!)).toEqual({
      actors: 30, multiNodeRoutes: 30,
      destinations: { r0c4: 26, r1c3: 4 },
      behaviors: { angry_mob: 8, protest: 18, queue: 4 },
    });
  });
});

describe('rebasePublic', () => {
  it('moves the deadline and visible-lock times to wall time without touching anything else', () => {
    const rebased = rebasePublic(reveal.public, 1_000_000 - reveal.atMs);
    expect(rebased.deadlineMs).toBe(1_000_000 + 20_000);
    expect(rebased.reactionPlan).toBe(reveal.public.reactionPlan);
    expect(rebased.citizens).toBe(reveal.public.citizens);
    for (const [i, paper] of rebased.papers.entries()) {
      const original = reveal.public.papers[i]!;
      expect(paper.lockedVisibleAtMs).toBe(original.lockedVisibleAtMs === null ? null : original.lockedVisibleAtMs + 1_000_000 - reveal.atMs);
    }
    expect(reveal.public.deadlineMs).toBe(88_000);
  });
});

describe('checkRun', () => {
  const destinations = new Map([[0, { x: 24, z: -24 }], [1, { x: 12, z: -12 }]]);
  it('passes when every actor moved and ended near its destination node', () => {
    const result = checkRun({
      start: new Map([[0, { x: 0, z: 0 }], [1, { x: 0, z: 0 }]]),
      end: new Map([[0, { x: 22, z: -21 }], [1, { x: 12, z: -10 }]]),
      destinations, durationMs: 20_050,
    });
    expect(result.problems).toEqual([]);
    expect(result.travelled).toBe(2);
    expect(result.maxDistanceFromDestination).toBeCloseTo(Math.hypot(2, 3));
  });

  it('reports actors that never moved, stopped far from their node, and a run off by more than half a second', () => {
    const result = checkRun({
      start: new Map([[0, { x: 0, z: 0 }], [1, { x: 0, z: 0 }]]),
      end: new Map([[0, { x: 0, z: 0 }], [1, { x: 0, z: 0 }]]),
      destinations, durationMs: 21_000,
    });
    expect(result.travelled).toBe(0);
    expect(result.problems).toEqual([
      'citizen 0 did not move', 'citizen 0 ended 33.9 from its destination',
      'citizen 1 did not move', 'citizen 1 ended 17.0 from its destination',
      'playback took 21000 ms, expected 20000 ± 500',
    ]);
  });
});
