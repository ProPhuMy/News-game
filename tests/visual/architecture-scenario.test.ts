import { describe, expect, it } from 'vitest';
import { parseArchitectureScenario } from '../../src/client/visual-test/architecture-scenario.ts';
import { sceneKind } from '../../src/client/visual-test/inspection-scenario.ts';

describe('parseArchitectureScenario', () => {
  it('fills defaults', () => {
    expect(parseArchitectureScenario('?scene=architecture')).toEqual({ variant: 'code', view: 'street', palette: 'b', seed: 1, reactionMs: 0, reducedMotion: false, time: null });
  });

  it('reads every parameter', () => {
    expect(parseArchitectureScenario('?variant=hybrid-palette&view=awning&palette=c&seed=4&reactionMs=1000&reducedMotion=true&time=night'))
      .toEqual({ variant: 'hybrid-palette', view: 'awning', palette: 'c', seed: 4, reactionMs: 1000, reducedMotion: true, time: 'night' });
  });

  it('rejects unknown values by name', () => {
    expect(() => parseArchitectureScenario('?variant=kit')).toThrow(/variant must be one of code, hybrid-original, hybrid-palette, got "kit"/);
    expect(() => parseArchitectureScenario('?view=top')).toThrow(/view must be one of street, awning, town, bakery, bank, town_hall, clinic, fountain_square, office, picket, got "top"/);
    expect(() => parseArchitectureScenario('?palette=z')).toThrow(/palette must be one of a, b, c, got "z"/);
    expect(() => parseArchitectureScenario('?reducedMotion=yes')).toThrow(/reducedMotion must be true or false, got "yes"/);
    expect(() => parseArchitectureScenario('?time=noon')).toThrow(/time must be one of morning, midday, afternoon, late, dusk, night, got "noon"/);
  });

  it('accepts every town view and rejects unknown ones', () => {
    for (const view of ['town', 'bakery', 'bank', 'town_hall', 'clinic', 'fountain_square', 'office', 'picket']) {
      expect(parseArchitectureScenario(`?view=${view}`).view).toBe(view);
    }
    expect(() => parseArchitectureScenario('?view=nowhere')).toThrow(/view must be one of/);
  });

  it('is its own scene kind', () => {
    expect(sceneKind('?scene=architecture')).toBe('architecture');
  });
});
