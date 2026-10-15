import { describe, expect, it } from 'vitest';
import { MIN_DISTINCT_COLORS, countDistinctColors, readyVerdict } from '../../src/client/visual-test/pixels.ts';

function pixels(colors: readonly [number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b], i) => data.set([r, g, b, 255], i * 4));
  return data;
}

describe('countDistinctColors', () => {
  it('counts one color for a uniform image', () => {
    expect(countDistinctColors(pixels(Array.from({ length: 100 }, () => [10, 20, 30] as [number, number, number])), 1)).toBe(1);
  });

  it('merges nearly identical shades into one bucket', () => {
    expect(countDistinctColors(pixels([[200, 200, 200], [201, 202, 203]]), 1)).toBe(1);
  });

  it('counts clearly different colors separately', () => {
    expect(countDistinctColors(pixels([[0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]]), 1)).toBe(4);
  });
});

describe('readyVerdict', () => {
  it('rejects a capture without WebGL', () => {
    expect(readyVerdict({ webgl: false, distinctColors: 500 })).toEqual({ status: 'error', error: 'webgl-unavailable' });
  });

  it('rejects a blank or uniform canvas', () => {
    expect(readyVerdict({ webgl: true, distinctColors: MIN_DISTINCT_COLORS - 1 })).toEqual({
      status: 'error',
      error: `empty-capture: only ${MIN_DISTINCT_COLORS - 1} distinct colors`,
    });
  });

  it('accepts a varied WebGL canvas', () => {
    expect(readyVerdict({ webgl: true, distinctColors: MIN_DISTINCT_COLORS })).toEqual({ status: 'ready' });
  });
});
