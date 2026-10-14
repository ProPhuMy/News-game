import { describe, expect, it } from 'vitest';
import { applyCommand, privateView, publicView, type MatchState } from '../../src/engine/index.ts';
import type { TownEvent } from '../../src/engine/state.ts';
import type { Location, TownClaim } from '../../src/shared/ids.ts';
import { advanceTo, checkLocation, lockClaim, lockExpose, quietMatch, run, withHeadline } from './helpers.ts';

const BAKERY: TownEvent = { templateId: 'bakery_truck', location: 'bakery', claim: 'health_scare', real: true };

/** Round 1 write; seat 0 checked `checked` during investigate (if given). */
function round1Write(checked?: Location): MatchState {
  let s = structuredClone(advanceTo(quietMatch(), 'investigate', 1));
  s.events[1] = [BAKERY];
  if (checked) s = run(s, 0, checkLocation(s, checked));
  return advanceTo(s, 'write', 1);
}

const lock = (s: MatchState, location: Location, claim: TownClaim, evidence = false, text?: string) =>
  applyCommand(s, 0, lockClaim(s, location, claim, evidence, text), 1_000);

describe('locking a claim', () => {
  it('stores a hidden headline and reports it for AI rating', () => {
    const s0 = round1Write('bakery');
    const r = lock(s0, 'bakery', 'health_scare', true, 'Bakery flour spoiled!');
    expect(r.result).toEqual({ ok: true });
    expect(r.state.headlines).toEqual([expect.objectContaining({ id: 'h1-0', isTrue: true, evidence: true, revealed: false })]);
    expect(r.events).toEqual([expect.objectContaining({ type: 'headlineLocked', headlineId: 'h1-0', botPersonality: null, text: 'Bakery flour spoiled!' })]);
    expect(privateView(r.state, 0).lockedHeadline?.story).toEqual({ kind: 'claim', location: 'bakery', claim: 'health_scare', attachEvidence: true });
    expect(publicView(r.state).headlines).toEqual([]);
    expect(r.state.seats[0]!.lockedVisibleAtMs).toBe(1_000);
  });

  it('rejects evidence that does not match the story', () => {
    expect(lock(round1Write('bakery'), 'bakery', 'scandal', true).result).toEqual({ ok: false, error: 'EVIDENCE_MISMATCH' });
    expect(lock(round1Write(), 'bakery', 'health_scare', true).result).toEqual({ ok: false, error: 'EVIDENCE_MISMATCH' });
  });

  it('judges truth from the hidden events', () => {
    expect(lock(round1Write(), 'clinic', 'danger').state.headlines[0]!.isTrue).toBe(false);
    expect(lock(round1Write(), 'clinic', 'all_clear').state.headlines[0]!.isTrue).toBe(true);
    expect(lock(round1Write(), 'bakery', 'all_clear').state.headlines[0]!.isTrue).toBe(false);
  });

  it('rejects blank, control-only and oversized text; cleans the rest', () => {
    expect(lock(round1Write(), 'bank', 'scandal', false, '   \u0007 ').result).toEqual({ ok: false, error: 'BAD_TEXT' });
    expect(lock(round1Write(), 'bank', 'scandal', false, 'x'.repeat(101)).result).toEqual({ ok: false, error: 'BAD_TEXT' });
    expect(lock(round1Write(), 'bank', 'scandal', false, '  Bank   boss\n').state.headlines[0]!.text).toBe('Bank boss');
  });

  it('rejects a lock that arrives after the write phase ended', () => {
    const s0 = round1Write();
    const late = lockClaim(s0, 'bank', 'scandal');
    const s = advanceTo(s0, 'reveal', 1);
    expect(applyCommand(s, 0, late, s.deadlineMs - 1).result).toEqual({ ok: false, error: 'STALE_PHASE' });
  });
});

describe('locking an expose', () => {
  function round2WithLie(proof: boolean, exposedRound: number | null = null): MatchState {
    const s = withHeadline(advanceTo(quietMatch(), 'write', 2), { seatId: 1, round: 1, location: 'bank', exposedRound });
    if (proof) s.seats[0]!.proofs.push({ headlineId: 'h1-1', round: 2 });
    return s;
  }

  it('needs a proof card', () => {
    const s = round2WithLie(false);
    expect(applyCommand(s, 0, lockExpose(s, 'h1-1'), 0).result).toEqual({ ok: false, error: 'NO_PROOF' });
  });

  it('targets the exposed headline location and is true', () => {
    const s = round2WithLie(true);
    const h = run(s, 0, lockExpose(s, 'h1-1')).headlines.find((x) => x.id === 'h2-0');
    expect(h).toMatchObject({ claim: 'expose', exposeOf: 'h1-1', location: 'bank', isTrue: true, evidence: false });
  });

  it('rejects a proof voided because the headline was already exposed', () => {
    const s = round2WithLie(true, 1);
    expect(applyCommand(s, 0, lockExpose(s, 'h1-1'), 0).result).toEqual({ ok: false, error: 'NO_PROOF' });
    expect(privateView(s, 0).proofs).toEqual([]);
  });
});
