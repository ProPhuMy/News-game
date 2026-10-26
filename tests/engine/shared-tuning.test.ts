import { describe, expect, it } from 'vitest';
import { CLAIMS, CLAIM_BEHAVIOR, COLORS, COLOR_ICONS } from '../../src/shared/ids.ts';
import { TUNING } from '../../src/shared/tuning.ts';

describe('tuning', () => {
  it('fits a full match in 585 s (60 s intro backstop, 25 s first Investigate, 60 s Write; user-approved 2026-10-26)', () => {
    const p = TUNING.phaseMs;
    const firstExtra = TUNING.firstRoundInvestigateMs - p.investigate;
    expect(p.intro + TUNING.rounds * (p.investigate + p.write + p.reveal) + firstExtra + p.final).toBe(585_000);
  });

  it('room codes never use 0, O, 1 or I', () => {
    expect(TUNING.limits.roomCodeAlphabet).not.toMatch(/[0O1I]/);
    expect(new Set(TUNING.limits.roomCodeAlphabet).size).toBe(TUNING.limits.roomCodeAlphabet.length);
  });

  it('has a base hype and a behavior for every claim', () => {
    for (const claim of CLAIMS) {
      expect(TUNING.baseHype[claim]).toBeGreaterThanOrEqual(1);
      expect(CLAIM_BEHAVIOR[claim]).toBeDefined();
    }
  });

  it('gives every color a distinct icon', () => {
    expect(new Set(COLORS.map((c) => COLOR_ICONS[c])).size).toBe(COLORS.length);
  });
});
