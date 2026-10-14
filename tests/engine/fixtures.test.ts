import { describe, expect, it } from 'vitest';
import { FixtureSchema } from '../../src/shared/fixture.ts';

const files = import.meta.glob('../../src/sim/fixtures/*.json', { eager: true, import: 'default' });

describe('recorded fixtures', () => {
  it('has the three planned matches', () => {
    expect(Object.keys(files).map((f) => f.split('/').at(-1)).sort()).toEqual(['caretaker-pulled.json', 'exposures.json', 'solo-honest.json']);
  });

  for (const [file, raw] of Object.entries(files)) {
    it(`${file} is valid, ordered in time and ends the match`, () => {
      const fixture = FixtureSchema.parse(raw);
      const times = fixture.frames.map((f) => f.atMs);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(fixture.frames.at(-1)!.public.phase).toBe('ended');
    });
  }

  it('covers player, town and final exposures, a pulled headline and the Caretaker', () => {
    const all = Object.values(files).map((raw) => FixtureSchema.parse(raw));
    const last = (name: string) => all.find((f) => f.name === name)!.frames.at(-1)!.public;
    expect(new Set(last('exposures').exposures.map((e) => e.source))).toEqual(new Set(['player', 'town', 'final']));
    expect(last('caretaker-pulled').headlines.some((h) => h.pulled)).toBe(true);
    expect(all.find((f) => f.name === 'caretaker-pulled')!.frames.some((f) => f.public.papers[0]!.controller === 'caretaker')).toBe(true);
  });
});
