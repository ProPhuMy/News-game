import { describe, expect, it } from 'vitest';
import { applyCommand, applyRating, createMatch, tick, type EngineEvent } from '../../src/engine/index.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { advanceTo, checkLocation, lockClaim, run, soloMatch } from '../engine/helpers.ts';

describe('bot turns', () => {
  it('bots lock template headlines at the start of Write, shown after 3–15 s', () => {
    const before = advanceTo(soloMatch(), 'investigate', 1);
    const start = before.deadlineMs;
    const { state: s, events } = tick(before, start);
    const bots = s.headlines.filter((h) => h.seatId !== 0);
    expect(bots).toHaveLength(3);
    for (const h of bots) {
      expect(h).toMatchObject({ botAuthored: true, revealed: false });
      expect(h.text).not.toMatch(/[{}]/);
      expect(h.text.length).toBeLessThanOrEqual(TUNING.limits.headlineChars);
      const shown = s.seats[h.seatId]!.lockedVisibleAtMs!;
      expect(shown).toBeGreaterThanOrEqual(start + TUNING.botLockDelayMs.min);
      expect(shown).toBeLessThanOrEqual(start + TUNING.botLockDelayMs.max);
    }
    const locked = events.filter((e): e is Extract<EngineEvent, { type: 'headlineLocked' }> => e.type === 'headlineLocked');
    expect(locked.map((e) => e.botPersonality)).toEqual(['tabloid', 'gazette', 'wildcard']);
  });

  it('bot lock events carry the personality fallback rating, which reveal applies when no rating arrives', () => {
    const before = advanceTo(soloMatch(), 'investigate', 1);
    const { state, events } = tick(before, before.deadlineMs);
    const locked = events.filter((e): e is Extract<EngineEvent, { type: 'headlineLocked' }> => e.type === 'headlineLocked');
    const juice = Object.fromEntries(locked.map((e) => [e.botPersonality, e.fallbackRating.juiciness]));
    expect(juice.tabloid).toBe(TUNING.bots.fallbackJuice.tabloid);
    expect(juice.gazette).toBe(TUNING.bots.fallbackJuice.gazette);
    expect(juice.wildcard).toBeGreaterThanOrEqual(TUNING.juiceMin);
    expect(juice.wildcard).toBeLessThanOrEqual(TUNING.juiceMax);
    const revealed = tick(state, state.deadlineMs).state;
    for (const e of locked) expect(revealed.headlines.find((h) => h.id === e.headlineId)!.rating).toEqual(e.fallbackRating);
  });

  it('the Gazette checks its tip location in round 1', () => {
    const s = advanceTo(soloMatch(), 'investigate', 1);
    expect(s.seats[2]!.evidence).toEqual([expect.objectContaining({ round: 1, location: s.seats[2]!.tip!.location })]);
  });

  it('the Caretaker writes from the human\'s evidence; the lock stands after reconnect', () => {
    const inv = advanceTo(soloMatch(), 'investigate', 1);
    let s = advanceTo(run(inv, 0, checkLocation(inv, inv.seats[0]!.tip!.location)), 'write', 1);
    const now = s.deadlineMs - 30_000;
    s = applyCommand(s, 0, { type: 'connection', connected: false }, now).state;
    const mine = s.headlines.find((h) => h.seatId === 0);
    expect(mine).toMatchObject({ botAuthored: true, authorPersonality: 'gazette' });
    expect(s.seats[0]!.paperName).toBe('Paper 1');
    s = applyCommand(s, 0, { type: 'connection', connected: true }, now + 1).state;
    expect(applyCommand(s, 0, lockClaim(s, 'bank', 'scandal'), now + 2).result).toEqual({ ok: false, error: 'ALREADY_ACTED' });
  });

  it('the Caretaker follows Gazette rules (sometimes probes a rival) yet never prints a blind all_clear', () => {
    let probedRival = false;
    for (let seed = 1; seed <= 40; seed++) {
      let s = soloMatch(seed);
      s = applyCommand(s, 0, { type: 'connection', connected: false }, 0).state;
      while (s.phase !== 'ended') s = tick(s, s.deadlineMs).state;
      if (s.seats[0]!.investigations.some((i) => i.target.kind === 'headline')) probedRival = true;
      expect(s.headlines.filter((h) => h.seatId === 0 && h.claim === 'all_clear' && !h.evidence)).toEqual([]);
    }
    expect(probedRival).toBe(true);
  });

  const botLineup = [{ kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }] as const;

  it('AI disabled: every bot publishes exactly once per round (seeds 1–200)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let s = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, seed, [...botLineup]);
      while (s.phase !== 'ended') s = tick(s, s.deadlineMs).state;
      for (const seat of s.seats) {
        for (let round = 1; round <= TUNING.rounds; round++) {
          const mine = s.headlines.filter((h) => h.seatId === seat.seatId && h.round === round);
          expect(mine, `seed ${seed} seat ${seat.seatId} (${seat.personality}) round ${round}`).toHaveLength(1);
        }
      }
      for (const h of s.headlines) {
        expect(h.revealed).toBe(true);
        expect(h.rating).not.toBeNull();
        expect(h.botAuthored).toBe(true);
      }
      expect(s.final?.winners.length).toBeGreaterThan(0);
    }
  }, 60_000); // 200 full matches: ~6 s alone, slower under the parallel suite

  it('AI generation failure: invalid bot text keeps the template headline', () => {
    let s = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 9, [...botLineup]);
    const template = new Map<string, string>();
    while (s.phase !== 'ended') {
      const out = tick(s, s.deadlineMs);
      s = out.state;
      for (const e of out.events) {
        if (e.type !== 'headlineLocked') continue;
        template.set(e.headlineId, e.text);
        s = applyRating(s, e.headlineId, e.fallbackRating, '');
        s = applyRating(s, e.headlineId, e.fallbackRating, 'x'.repeat(TUNING.limits.headlineChars + 1));
      }
    }
    expect(template.size).toBe(TUNING.seats * TUNING.rounds);
    expect(s.headlines).toHaveLength(template.size);
    for (const h of s.headlines) {
      expect(h.text).toBe(template.get(h.id));
      expect(h.revealed).toBe(true);
    }
  });
});
