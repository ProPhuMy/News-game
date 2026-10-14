import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch, tick, type EngineEvent } from '../../src/engine/index.ts';
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

  it('plays a bot-only match to the end; only the Gazette may sit a round out', () => {
    let s = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 9, [{ kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]);
    while (s.phase !== 'ended') s = tick(s, s.deadlineMs).state;
    for (const seat of s.seats.filter((x) => x.personality !== 'gazette')) {
      expect(s.headlines.filter((h) => h.seatId === seat.seatId)).toHaveLength(TUNING.rounds);
    }
    expect(s.final?.winners.length).toBeGreaterThan(0);
  });
});
