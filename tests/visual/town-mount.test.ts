import { describe, expect, it } from 'vitest';
import type { TownView } from '../../src/client/town/index.ts';
import { recordingFactory, type FactoryRecord } from '../../src/client/visual-test/town-mount.ts';
import { parsePalette } from '../../src/client/visual-test/scenario.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';

const fakeView = {} as TownView;

describe('recordingFactory', () => {
  it('records the palette id the town passed, not the one requested', () => {
    const record: FactoryRecord = { view: null, palette: null };
    const create = recordingFactory(record, () => fakeView);
    expect(create({ container: {} as HTMLElement, palette: getPalette('a') })).toBe(fakeView);
    expect(record).toEqual({ view: fakeView, palette: 'a' });
  });

  it('records null when the factory received no palette', () => {
    const record: FactoryRecord = { view: null, palette: null };
    recordingFactory(record, () => fakeView)({ container: {} as HTMLElement });
    expect(record.palette).toBeNull();
  });
});

describe('parsePalette', () => {
  it('defaults to the production palette and validates', () => {
    expect(parsePalette('')).toBe('b');
    expect(parsePalette('?palette=a')).toBe('a');
    expect(() => parsePalette('?palette=z')).toThrow(/palette must be a, b or c/);
  });
});
