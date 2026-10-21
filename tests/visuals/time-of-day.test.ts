import { describe, expect, it } from 'vitest';
import { PHASES } from '../../src/shared/ids.ts';
import { getPalette, PALETTES, type PaletteId } from '../../src/client/visuals/palette.ts';
import { TIMES_OF_DAY, timeOfDay, timeOfDayLook } from '../../src/client/visuals/time-of-day.ts';

// WCAG relative luminance of a 0xRRGGBB color.
function luminance(hex: number): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin((hex >> 16) & 255) + 0.7152 * lin((hex >> 8) & 255) + 0.0722 * lin(hex & 255);
}

describe('timeOfDay', () => {
  it('runs from round-one morning to final-edition night (interface §5c)', () => {
    expect(timeOfDay(0, 'intro')).toBe('morning');
    for (const phase of ['investigate', 'write', 'reveal'] as const) {
      expect([1, 2, 3, 4, 5].map((round) => timeOfDay(round, phase))).toEqual(['morning', 'midday', 'afternoon', 'late', 'dusk']);
    }
    expect(timeOfDay(5, 'final')).toBe('night');
    expect(timeOfDay(5, 'ended')).toBe('night');
  });

  it('answers for every phase and out-of-range rounds without throwing', () => {
    for (const phase of PHASES) for (const round of [-1, 0, 6, 99]) expect(TIMES_OF_DAY).toContain(timeOfDay(round, phase));
    expect(timeOfDay(9, 'reveal')).toBe('dusk');
  });
});

describe('timeOfDayLook', () => {
  it('defines a look for every time and palette', () => {
    for (const id of Object.keys(PALETTES) as PaletteId[]) {
      for (const time of TIMES_OF_DAY) {
        const look = timeOfDayLook(getPalette(id), time);
        for (const key of ['sky', 'fog', 'hemiSky', 'hemiGround', 'sun'] as const) {
          expect(Number.isInteger(look[key]) && look[key] >= 0 && look[key] <= 0xffffff, `${id} ${time} ${key}`).toBe(true);
        }
      }
    }
  });

  it('midday is the approved daytime look: palette sky, fog and ground at full light, lamps off', () => {
    const palette = getPalette('b');
    expect(timeOfDayLook(palette, 'midday')).toMatchObject({
      sky: palette.town.sky, fog: palette.town.fog, hemiSky: palette.town.sky, hemiGround: palette.town.ground, lightScale: 1, lampLevel: 0,
    });
  });

  it('night feels like night with lamps lit, but is never too dark (user rule)', () => {
    const night = timeOfDayLook(getPalette('b'), 'night');
    const midday = timeOfDayLook(getPalette('b'), 'midday');
    expect(night.lightScale).toBeGreaterThanOrEqual(0.55);
    expect(night.lightScale).toBeLessThan(0.75);
    expect(night.lampLevel).toBe(1);
    expect(luminance(night.sky)).toBeGreaterThanOrEqual(0.04);
    expect(luminance(night.sky)).toBeLessThan(luminance(midday.sky) / 3);
  });

  it('daytime stays bright and lamps only come on toward evening', () => {
    const levels = TIMES_OF_DAY.map((t) => timeOfDayLook(getPalette('b'), t));
    for (const look of levels.slice(0, 4)) expect(look.lightScale).toBeGreaterThanOrEqual(0.75);
    expect(levels.slice(0, 3).map((l) => l.lampLevel)).toEqual([0, 0, 0]);
    const lamps = levels.map((l) => l.lampLevel);
    expect([...lamps].sort((a, b) => a - b)).toEqual(lamps);
  });
});
