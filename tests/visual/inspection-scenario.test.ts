import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INSPECTION,
  parseInspectionScenario,
  inspectionReadyError,
  sceneKind,
} from '../../src/client/visual-test/inspection-scenario.ts';

describe('sceneKind', () => {
  it('defaults to the town scene', () => {
    expect(sceneKind('')).toBe('town');
    expect(sceneKind('?scene=town')).toBe('town');
  });

  it('recognizes the character inspection scene', () => {
    expect(sceneKind('?scene=inspect-character')).toBe('inspect-character');
  });

  it('rejects unknown scenes', () => {
    expect(() => sceneKind('?scene=lobby')).toThrow(/scene must be town, inspect-character, architecture or crowd, got "lobby"/);
  });
});

describe('parseInspectionScenario', () => {
  it('uses the agreed defaults: Kenney male A, bind pose, one character', () => {
    expect(parseInspectionScenario('?scene=inspect-character')).toEqual(DEFAULT_INSPECTION);
    expect(DEFAULT_INSPECTION).toEqual({
      model: 'characters/kenney-mini/character-male-a.glb', clip: null, timeMs: 0, count: 1, seed: 1,
    });
  });

  it('reads model, clip, time, count and seed', () => {
    expect(parseInspectionScenario(
      '?scene=inspect-character&model=characters/kenney-mini/character-female-b.glb&clip=walk&timeMs=750&count=30&seed=4',
    )).toEqual({ model: 'characters/kenney-mini/character-female-b.glb', clip: 'walk', timeMs: 750, count: 30, seed: 4 });
  });

  it('only accepts local GLB or glTF files under characters/', () => {
    expect(() => parseInspectionScenario('?model=characters/../secrets.glb')).toThrow(/model must be a .glb or .gltf path under characters\//);
    expect(() => parseInspectionScenario('?model=buildings/bakery.glb')).toThrow(/model must be/);
    expect(() => parseInspectionScenario('?model=https://example.com/x.glb')).toThrow(/model must be/);
    expect(() => parseInspectionScenario('?model=characters/x.fbx')).toThrow(/model must be/);
  });

  it('rejects clip names with unexpected characters', () => {
    expect(() => parseInspectionScenario('?clip=<script>')).toThrow(/clip must be 1-64 letters, digits, spaces, dots, dashes or underscores/);
  });

  it('keeps count between 1 and 30', () => {
    expect(() => parseInspectionScenario('?count=0')).toThrow(/count must be between 1 and 30, got 0/);
    expect(() => parseInspectionScenario('?count=31')).toThrow(/count must be between 1 and 30, got 31/);
  });
});

describe('inspectionReadyError', () => {
  it('accepts a single character when the scene does not report a count', () => {
    expect(inspectionReadyError({ degraded: [], clips: ['idle'] }, 1)).toBeNull();
  });

  it('accepts a matching instance count', () => {
    expect(inspectionReadyError({ degraded: [], clips: ['idle'], instances: 30 }, 30)).toBeNull();
  });

  it('refuses a thirty-character proof that the scene did not draw', () => {
    expect(inspectionReadyError({ degraded: [], clips: ['idle'] }, 30)).toBe('count-mismatch: requested 30 characters, scene reports 1');
    expect(inspectionReadyError({ degraded: [], clips: ['idle'], instances: 12 }, 30)).toBe('count-mismatch: requested 30 characters, scene reports 12');
  });

  it('fails on degraded assets before checking the count', () => {
    expect(inspectionReadyError({ degraded: ['character-male-a.glb: texture missing'], clips: [] }, 1))
      .toBe('degraded-assets: character-male-a.glb: texture missing');
  });
});
