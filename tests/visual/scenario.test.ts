import { describe, expect, it } from 'vitest';
import soloHonest from '../../src/sim/fixtures/solo-honest.json';
import {
  DEFAULT_SCENARIO,
  parseFixture,
  parseScenario,
  selectFrameIndex,
} from '../../src/client/visual-test/scenario.ts';

describe('parseScenario', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseScenario('')).toEqual(DEFAULT_SCENARIO);
  });

  it('reads every field', () => {
    expect(parseScenario('?fixture=exposures&round=3&phase=write&reactionMs=1500&reducedMotion=true&seed=7')).toEqual({
      fixture: 'exposures', round: 3, phase: 'write', reactionMs: 1500, reducedMotion: true, seed: 7,
    });
  });

  it('rejects an unknown phase and names the valid ones', () => {
    expect(() => parseScenario('?phase=lunch')).toThrow(/phase must be one of intro, investigate, write, reveal, final, ended/);
  });

  it('rejects fixture names that could escape the fixtures folder', () => {
    expect(() => parseScenario('?fixture=../secrets')).toThrow(/fixture must match/);
  });

  it('rejects non-integer and out-of-range numbers', () => {
    expect(() => parseScenario('?round=1.5')).toThrow(/round must be a whole number/);
    expect(() => parseScenario('?reactionMs=999999')).toThrow(/reactionMs must be between 0 and 120000/);
  });

  it('rejects reducedMotion values other than true or false', () => {
    expect(() => parseScenario('?reducedMotion=yes')).toThrow(/reducedMotion must be true or false/);
  });
});

describe('selectFrameIndex', () => {
  const fixture = parseFixture(soloHonest);

  it('finds the first frame for a round and phase', () => {
    const index = selectFrameIndex(fixture, 1, 'reveal');
    expect(fixture.frames[index]!.public.round).toBe(1);
    expect(fixture.frames[index]!.public.phase).toBe('reveal');
    expect(fixture.frames[index]!.public.reactionPlan).toBeTruthy();
  });

  it('lists the available frames when the scenario is missing', () => {
    expect(() => selectFrameIndex(fixture, 9, 'reveal')).toThrow(/no frame for round 9 reveal; available: 0:intro, 1:investigate/);
  });
});

describe('noWebgl scenario flag', () => {
  it('town and app scenarios carry noWebgl', async () => {
    const { parseTownScenario } = await import('../../src/client/visual-test/scenario.ts');
    const { parseAppScenario } = await import('../../src/client/visual-test/app-scenario.ts');
    expect(parseTownScenario('?noWebgl=true').noWebgl).toBe(true);
    expect(parseTownScenario('').noWebgl).toBe(false);
    expect(parseAppScenario('?noWebgl=true').noWebgl).toBe(true);
    expect(() => parseTownScenario('?noWebgl=1')).toThrow(/noWebgl must be true or false/);
  });
});
