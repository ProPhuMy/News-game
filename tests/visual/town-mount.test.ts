/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { TownView } from '../../src/client/town/index.ts';
import { recordingFactory, townMountOptions, verifyFallback, type FactoryRecord } from '../../src/client/visual-test/town-mount.ts';
import { parsePalette, parseTownScenario } from '../../src/client/visual-test/scenario.ts';
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

describe('palette forwarding', () => {
  it('townMountOptions hands the scenario palette to mountTown', () => {
    for (const id of ['a', 'c'] as const) {
      const options = townMountOptions({ reducedMotion: false, palette: id }, {} as never, () => fakeView);
      expect(options.palette?.id).toBe(id);
    }
  });

  it('parseTownScenario carries ?palette= into the scenario', () => {
    expect(parseTownScenario('?palette=c').palette).toBe('c');
    expect(parseTownScenario('').palette).toBe('b');
  });
});

describe('verifyFallback', () => {
  it('errors when the view reports WebGL support', () => {
    const container = document.createElement('div');
    expect(verifyFallback({ isWebGLSupported: () => true } as TownView, container)).toMatch(/^no-webgl: /);
  });

  it('errors when the fallback element is missing', () => {
    expect(verifyFallback({ isWebGLSupported: () => false } as TownView, document.createElement('div'))).toMatch(/^no-webgl: .*fallback/);
  });

  it('accepts a fallback view with its status element', () => {
    const container = document.createElement('div');
    const fallback = document.createElement('div');
    fallback.className = 'town-fallback-container';
    fallback.setAttribute('role', 'status');
    container.appendChild(fallback);
    expect(verifyFallback({ isWebGLSupported: () => false } as TownView, container)).toBeNull();
  });
});
