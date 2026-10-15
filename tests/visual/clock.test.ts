import { afterEach, describe, expect, it } from 'vitest';
import { createVirtualClock, mulberry32 } from '../../src/client/visual-test/clock.ts';

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('createVirtualClock', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('replaces the time sources and restores them', () => {
    const realDateNow = Date.now;
    const realRandom = Math.random;
    const clock = createVirtualClock(5_000, 1);
    restore = clock.install();
    expect(Date.now()).toBe(5_000);
    expect(performance.now()).toBe(0);
    expect(Math.random).not.toBe(realRandom);
    restore();
    restore = null;
    expect(Date.now).toBe(realDateNow);
    expect(Math.random).toBe(realRandom);
  });

  it('runs queued animation frames once per step with the virtual time', () => {
    const clock = createVirtualClock(1_000, 1);
    restore = clock.install();
    const times: number[] = [];
    const loop = (t: number) => {
      times.push(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    clock.advance(50, 25);
    expect(times).toEqual([25, 50]);
    expect(Date.now()).toBe(1_050);
  });

  it('drops cancelled frames', () => {
    const clock = createVirtualClock(0, 1);
    restore = clock.install();
    let calls = 0;
    const id = requestAnimationFrame(() => { calls += 1; });
    cancelAnimationFrame(id);
    clock.advance(100);
    expect(calls).toBe(0);
  });
});
