import { describe, expect, it } from 'vitest';
import type { TownEvent } from '../../src/engine/state.ts';
import { assignTips } from '../../src/engine/tips.ts';
import { rollEvents, truthAt } from '../../src/engine/truth.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { advanceTo, quietMatch } from './helpers.ts';

const T = SAMPLE_CONTENT.eventTemplates;

describe('rollEvents', () => {
  it('rolls 3 events at 3 different locations, reproducibly', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const events = rollEvents(seed, 1, T);
      expect(events).toHaveLength(3);
      expect(new Set(events.map((e) => e.location)).size).toBe(3);
      expect(rollEvents(seed, 1, T)).toEqual(events);
    }
  });

  it('makes events real at a rate inside the pReal range', () => {
    let real = 0;
    let total = 0;
    for (let seed = 1; seed <= 2_000; seed++) {
      for (const e of rollEvents(seed, 2, T)) { total++; if (e.real) real++; }
    }
    expect(real / total).toBeGreaterThan(0.35);
    expect(real / total).toBeLessThan(0.6);
  });
});

describe('truthAt', () => {
  const events: TownEvent[] = [
    { templateId: 'bakery_truck', location: 'bakery', claim: 'health_scare', real: true },
    { templateId: 'bank_suits', location: 'bank', claim: 'scandal', real: false },
  ];
  it('a real event makes only its claim true', () => expect(truthAt(events, 'bakery')).toBe('health_scare'));
  it('an innocent event leaves only all_clear true', () => expect(truthAt(events, 'bank')).toBe('all_clear'));
  it('no event means all_clear', () => expect(truthAt(events, 'clinic')).toBe('all_clear'));
});

describe('assignTips', () => {
  it('gives every seat a tip about a current event, never the same text twice in a round', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const events = rollEvents(seed, 1, T);
      const tips = assignTips(seed, 1, events, T, 4);
      expect(new Set(tips.map((t) => t.text)).size).toBe(4);
      for (const tip of tips) {
        expect(events.find((e) => e.location === tip.location)?.claim).toBe(tip.claim);
        expect(tip.round).toBe(1);
      }
    }
  });

  it('is wired into each new round', () => {
    const s = advanceTo(quietMatch(), 'investigate', 1);
    expect(s.events[1]).toHaveLength(3);
    for (const seat of s.seats) expect(seat.tip?.round).toBe(1);
  });
});
