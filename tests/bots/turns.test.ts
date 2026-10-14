import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch, tick, type EngineEvent } from '../../src/engine/index.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { advanceTo, lockClaim, soloMatch } from '../engine/helpers.ts';

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

  it('the Gazette checks its tip location in round 1', () => {
    const s = advanceTo(soloMatch(), 'investigate', 1);
    expect(s.seats[2]!.evidence).toEqual([expect.objectContaining({ round: 1, location: s.seats[2]!.tip!.location })]);
  });

  it('the Caretaker writes for a disconnected human; the lock stands after reconnect', () => {
    let s = advanceTo(soloMatch(), 'write', 1);
    const now = s.deadlineMs - 30_000;
    s = applyCommand(s, 0, { type: 'connection', connected: false }, now).state;
    const mine = s.headlines.find((h) => h.seatId === 0);
    expect(mine).toMatchObject({ botAuthored: true, authorPersonality: 'gazette' });
    expect(s.seats[0]!.paperName).toBe('Paper 1');
    s = applyCommand(s, 0, { type: 'connection', connected: true }, now + 1).state;
    expect(applyCommand(s, 0, lockClaim(s, 'bank', 'scandal'), now + 2).result).toEqual({ ok: false, error: 'ALREADY_ACTED' });
  });

  it('plays a bot-only match to the end with every paper printing each round', () => {
    let s = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 9, [{ kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]);
    while (s.phase !== 'ended') s = tick(s, s.deadlineMs).state;
    expect(s.headlines).toHaveLength(TUNING.rounds * TUNING.seats);
    expect(s.final?.winners.length).toBeGreaterThan(0);
  });
});
