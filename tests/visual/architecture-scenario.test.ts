import { describe, expect, it } from 'vitest';
import { parseArchitectureScenario } from '../../src/client/visual-test/architecture-scenario.ts';
import { sceneKind } from '../../src/client/visual-test/inspection-scenario.ts';

describe('parseArchitectureScenario', () => {
  it('fills defaults', () => {
    expect(parseArchitectureScenario('?scene=architecture')).toEqual({ variant: 'code', view: 'street', palette: 'a', seed: 1, reactionMs: 0, reducedMotion: false });
  });

  it('reads every parameter', () => {
    expect(parseArchitectureScenario('?variant=hybrid-palette&view=awning&palette=c&seed=4&reactionMs=1000&reducedMotion=true'))
      .toEqual({ variant: 'hybrid-palette', view: 'awning', palette: 'c', seed: 4, reactionMs: 1000, reducedMotion: true });
  });

  it('rejects unknown values by name', () => {
    expect(() => parseArchitectureScenario('?variant=kit')).toThrow(/variant must be one of code, hybrid-original, hybrid-palette, got "kit"/);
    expect(() => parseArchitectureScenario('?view=top')).toThrow(/view must be one of street, awning, got "top"/);
    expect(() => parseArchitectureScenario('?palette=z')).toThrow(/palette must be one of a, b, c, got "z"/);
    expect(() => parseArchitectureScenario('?reducedMotion=yes')).toThrow(/reducedMotion must be true or false, got "yes"/);
  });

  it('is its own scene kind', () => {
    expect(sceneKind('?scene=architecture')).toBe('architecture');
  });
});
