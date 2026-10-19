import { describe, expect, it } from 'vitest';
import { parseAppScenario } from '../../src/client/visual-test/app-scenario.ts';

describe('parseAppScenario', () => {
  it('fills defaults on top of the town scenario', () => {
    expect(parseAppScenario('?round=2&phase=write')).toMatchObject({
      fixture: 'solo-honest', round: 2, phase: 'write', screen: 'match', palette: 'a', stressText: false,
    });
  });

  it('reads screen, palette and stress text', () => {
    expect(parseAppScenario('?screen=disconnected&palette=c&stressText=true'))
      .toMatchObject({ screen: 'disconnected', palette: 'c', stressText: true });
  });

  it('rejects unknown values', () => {
    expect(() => parseAppScenario('?screen=home')).toThrow(/screen must be one of match, loading, disconnected, error/);
    expect(() => parseAppScenario('?palette=z')).toThrow(/palette must be a, b or c/);
    expect(() => parseAppScenario('?stressText=yes')).toThrow(/stressText must be true or false/);
  });
});
