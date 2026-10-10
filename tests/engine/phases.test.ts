import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch, privateView, publicView, tick } from '../../src/engine/index.ts';
import { PrivateSnapshotSchema, PublicSnapshotSchema } from '../../src/shared/snapshots.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { HUMAN, advanceTo, run, skipIntro, skipInvestigate, skipWrite, soloMatch } from './helpers.ts';

describe('createMatch', () => {
  it('fills empty seats with Tabloid, Gazette, Wildcard and free colors', () => {
    const s = soloMatch();
    expect(s.seats.map((seat) => seat.personality)).toEqual([null, 'tabloid', 'gazette', 'wildcard']);
    expect(s.seats.map((seat) => seat.controller)).toEqual(['human', 'bot', 'bot', 'bot']);
    expect(new Set(s.seats.map((seat) => seat.color)).size).toBe(4);
    expect(s.seats[1]!.paperName).toBe(SAMPLE_CONTENT.botPapers.tabloid);
    expect(s.seats.every((seat) => seat.trust === TUNING.trust.start)).toBe(true);
  });

  it('seeds 30 unsubscribed citizens deterministically', () => {
    const a = soloMatch(7);
    expect(a.citizens).toHaveLength(TUNING.citizens);
    expect(soloMatch(7).citizens).toEqual(a.citizens);
    expect(soloMatch(8).citizens).not.toEqual(a.citizens);
    for (const c of a.citizens) {
      expect(c.gullibility).toBeGreaterThanOrEqual(TUNING.gullibility.min);
      expect(c.gullibility).toBeLessThanOrEqual(TUNING.gullibility.max);
      expect(c.paper).toBeNull();
    }
  });

  it('rejects two humans with the same color', () => {
    expect(() => createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 1, [HUMAN, HUMAN, { kind: 'bot' }, { kind: 'bot' }])).toThrow();
  });

  it('starts in the intro with a 20 s deadline', () => {
    const s = createMatch({ content: SAMPLE_CONTENT, startMs: 1_000 }, 1, [HUMAN, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]);
    expect([s.round, s.phase, s.deadlineMs]).toEqual([0, 'intro', 21_000]);
  });
});

describe('phase machine', () => {
  it('returns the same state before the deadline', () => {
    const s = soloMatch();
    expect(tick(s, s.deadlineMs - 1).state).toBe(s);
  });

  it('ends the intro early once every connected human skips', () => {
    let s = soloMatch();
    s = run(s, 0, skipIntro(s), 500);
    s = tick(s, 500).state;
    expect([s.round, s.phase, s.deadlineMs]).toEqual([1, 'investigate', 500 + TUNING.phaseMs.investigate]);
  });

  it('plays 5 rounds and the Final Edition in 460 s when nobody acts', () => {
    let s = soloMatch();
    const reveals: number[] = [];
    while (s.phase !== 'ended') {
      s = tick(s, s.deadlineMs).state;
      if (s.phase === 'reveal') reveals.push(s.round);
    }
    expect(reveals).toEqual([1, 2, 3, 4, 5]);
    expect(s.deadlineMs).toBe(460_000);
  });

  it('advances only one phase when ticked very late', () => {
    let s = advanceTo(soloMatch(), 'write', 1);
    const late = s.deadlineMs + 120_000;
    s = tick(s, late).state;
    expect([s.round, s.phase, s.deadlineMs]).toEqual([1, 'reveal', late + TUNING.phaseMs.reveal]);
  });

  it('produces schema-valid snapshots in every phase', () => {
    let s = soloMatch();
    while (s.phase !== 'ended') {
      PublicSnapshotSchema.parse(publicView(s));
      PrivateSnapshotSchema.parse(privateView(s, 0));
      s = tick(s, s.deadlineMs).state;
    }
    PublicSnapshotSchema.parse(publicView(s));
  });
});

describe('commands', () => {
  it('rejects commands for another phase or round', () => {
    const s = soloMatch();
    expect(applyCommand(s, 0, skipWrite(s), 0).result).toEqual({ ok: false, error: 'STALE_PHASE' });
    expect(applyCommand(s, 0, { type: 'skipIntro', actionId: 'test', round: 3, phase: s.phase }, 0).result).toEqual({ ok: false, error: 'STALE_PHASE' });
  });

  it('rejects a second action and leaves state untouched', () => {
    const first = soloMatch();
    const s = run(first, 0, skipIntro(first), 0);
    const r = applyCommand(s, 0, skipIntro(s), 0);
    expect(r.result).toEqual({ ok: false, error: 'ALREADY_ACTED' });
    expect(r.state).toBe(s);
  });

  it('rejects commands for bot seats and unknown seats', () => {
    const s = soloMatch();
    expect(applyCommand(s, 1, skipIntro(s), 0).result).toEqual({ ok: false, error: 'NOT_ALLOWED' });
    expect(applyCommand(s, 9, skipIntro(s), 0).result).toEqual({ ok: false, error: 'NOT_ALLOWED' });
  });

  it('hands a disconnected seat to the Caretaker; its action stands after reconnect', () => {
    let s = advanceTo(soloMatch(), 'investigate', 1);
    s = applyCommand(s, 0, { type: 'connection', connected: false }, s.deadlineMs - 1).state;
    expect(s.seats[0]!.controller).toBe('caretaker');
    expect(s.seats[0]!.acted).toBe(true);
    s = applyCommand(s, 0, { type: 'connection', connected: true }, s.deadlineMs - 1).state;
    expect(s.seats[0]!.controller).toBe('human');
    expect(applyCommand(s, 0, skipInvestigate(s), s.deadlineMs - 1).result).toEqual({ ok: false, error: 'ALREADY_ACTED' });
  });
});
