/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { COLORS } from '../../src/shared/ids.ts';
import {
  APPROVED_PALETTE, PALETTES, getPalette, paletteCssVariables, applyPaletteCssVariables, type PaletteId, type PaperSwatch,
} from '../../src/client/visuals/palette.ts';

const IDS: PaletteId[] = ['a', 'b', 'c'];
const VARIABLES = [
  '--nt-paper', '--nt-ink', '--nt-panel', '--nt-border', '--nt-accent', '--nt-danger', '--nt-focus',
  '--nt-paper-red', '--nt-paper-blue', '--nt-paper-green', '--nt-paper-gold', '--nt-unsubscribed',
];

function luminance(css: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
const swatches = (id: PaletteId): PaperSwatch[] => [...COLORS.map((c) => getPalette(id).paper[c]), getPalette(id).unsubscribed];

describe('presentation palette', () => {
  it.each(IDS)('palette %s: every swatch css matches its hex and has a label', (id) => {
    expect(getPalette(id)).toBe(PALETTES[id]);
    expect(getPalette(id).id).toBe(id);
    for (const s of swatches(id)) {
      expect(s.css).toBe(`#${s.hex.toString(16).padStart(6, '0')}`);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it('variant a keeps the current paper colors so UI and town agree until D1', () => {
    const a = getPalette('a');
    expect([a.paper.red.hex, a.paper.blue.hex, a.paper.green.hex, a.paper.gold.hex, a.unsubscribed.hex])
      .toEqual([0xc0392b, 0x2980b9, 0x27ae60, 0xd4ac0d, 0x7f8c8d]);
  });

  it.each(IDS)('palette %s: text and focus contrast meet WCAG', (id) => {
    const { ui } = getPalette(id);
    expect(contrast(ui.ink, ui.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ui.ink, ui.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ui.focus, ui.panel)).toBeGreaterThanOrEqual(3);
    expect(contrast(ui.focus, ui.paper)).toBeGreaterThanOrEqual(3);
  });

  it.each([['a', 0x8a5a3c], ['b', 0x7a5236], ['c', 0x9a6a42]] as const)(
    'palette %s: wood is a brown distinct from its roof', (id, wood) => {
      const { town } = getPalette(id);
      expect(town.wood).toBe(wood);
      expect(town.wood).not.toBe(town.roof);
    },
  );

  it('the user-approved palette is b (D1 art decision)', () => {
    expect(APPROVED_PALETTE).toBe('b');
  });

  it('paletteCssVariables names every --nt-* variable', () => {
    expect(Object.keys(paletteCssVariables(getPalette('b'))).sort()).toEqual([...VARIABLES].sort());
  });

  it('applyPaletteCssVariables sets every variable on the element', () => {
    const root = document.createElement('div');
    const palette = getPalette('c');
    applyPaletteCssVariables(root, palette);
    for (const name of VARIABLES) expect(root.style.getPropertyValue(name)).toBe(paletteCssVariables(palette)[name]);
  });
});
