// Presentation palette (owner: Claude). The one source of themed colors for the UI (CSS variables)
// and, from D1, the town renderer. Variants a/b/c are previews; the user picks the final one in D1.
import { COLORS, type Color } from '../../shared/ids.ts';

export type PaletteId = 'a' | 'b' | 'c'; // the three D1 sample variants; renamed once the user chooses

export interface PaperSwatch {
  hex: number;   // for Three.js materials
  css: string;   // for CSS, e.g. '#c0392b'
  label: string; // readable name for the non-color cue, e.g. 'Red'
}

export interface PresentationPalette {
  id: PaletteId;
  ui: { paper: string; ink: string; panel: string; border: string; accent: string; danger: string; focus: string };
  town: { ground: number; road: number; plaza: number; foliage: number; brick: number; trim: number; roof: number; wood: number; outline: number; sky: number; fog: number; lampGlow: number };
  paper: Readonly<Record<Color, PaperSwatch>>;
  unsubscribed: PaperSwatch;
  /** Hand-drawn onboarding mini-comic (UI only): chibi skin tone, echoing the Kenney mini characters. */
  illustration: { skin: string };
}

const swatch = (hex: number, label: string): PaperSwatch => ({ hex, css: `#${hex.toString(16).padStart(6, '0')}`, label });
const papers = (red: number, blue: number, green: number, gold: number): Readonly<Record<Color, PaperSwatch>> => ({
  red: swatch(red, 'Red'), blue: swatch(blue, 'Blue'), green: swatch(green, 'Green'), gold: swatch(gold, 'Gold'),
});

export const PALETTES: Readonly<Record<PaletteId, PresentationPalette>> = {
  // a: today's paper colors on cream newsprint.
  a: {
    id: 'a',
    ui: { paper: '#f4ecd8', ink: '#1f1d1a', panel: '#fdfbf7', border: '#d3c7aa', accent: '#c98a2c', danger: '#a8322a', focus: '#0f6e6e' },
    town: { ground: 0x9dbf7a, road: 0xcbbf9f, plaza: 0xe2d6b8, foliage: 0x5d8f4a, brick: 0xb5523b, trim: 0xf4ecd8, roof: 0x8c3b2e, wood: 0x8a5a3c, outline: 0x1f1d1a, sky: 0xbfdde3, fog: 0xe8e0c8, lampGlow: 0xffd27a },
    paper: papers(0xc0392b, 0x2980b9, 0x27ae60, 0xd4ac0d),
    unsubscribed: swatch(0x7f8c8d, 'Unsubscribed'),
    illustration: { skin: '#f2c9a0' },
  },
  // b: brick red and teal lead; warmer paper.
  b: {
    id: 'b',
    ui: { paper: '#efe4cc', ink: '#22201c', panel: '#fbf6ea', border: '#cdbb95', accent: '#b5523b', danger: '#9b2c22', focus: '#1f6f78' },
    town: { ground: 0x93b06f, road: 0xc4b48f, plaza: 0xdccca6, foliage: 0x4f7f44, brick: 0xa8452f, trim: 0xefe4cc, roof: 0x2f6f73, wood: 0x7a5236, outline: 0x22201c, sky: 0xb4d4d6, fog: 0xe3d7ba, lampGlow: 0xffc864 },
    paper: papers(0xb33a2e, 0x2a6f97, 0x4a8a3c, 0xc9971c),
    unsubscribed: swatch(0x8a8c86, 'Unsubscribed'),
    illustration: { skin: '#f2c9a0' },
  },
  // c: mustard and soft green lead; lighter panels.
  c: {
    id: 'c',
    ui: { paper: '#f2e9d0', ink: '#1e2421', panel: '#fffaf0', border: '#c9c19f', accent: '#d19a2a', danger: '#a63a2c', focus: '#2b5f45' },
    town: { ground: 0xa6c487, road: 0xd2c49e, plaza: 0xe8dcb9, foliage: 0x6a9a58, brick: 0xc0603f, trim: 0xfffaf0, roof: 0xd19a2a, wood: 0x9a6a42, outline: 0x1e2421, sky: 0xc8e2df, fog: 0xece3c8, lampGlow: 0xffdc8a },
    paper: papers(0xc4452f, 0x2f6fa8, 0x3f8f5a, 0xd8a521),
    unsubscribed: swatch(0x868a83, 'Unsubscribed'),
    illustration: { skin: '#f2c9a0' },
  },
};

/** Light tints the time-of-day looks blend into each palette (presentation interface §5c). */
export const TIME_TINTS = {
  daylight: 0xffffff, // midday sun
  morning: 0xfff0d2,  // soft warm sunrise
  dusk: 0xf0a060,     // orange evening
  night: 0x1c2c58,    // deep blue night sky, never black
  moon: 0xa8bce8,     // cool night key light
} as const;

/** The palette the user approved at the D1 art decision (presentation-interface note §5b). */
export const APPROVED_PALETTE: PaletteId = 'b';

export function getPalette(id: PaletteId): PresentationPalette {
  return PALETTES[id];
}

/** The --nt-* custom properties for a palette; pure, so the capture command can use it outside a browser. */
export function paletteCssVariables(palette: PresentationPalette): Readonly<Record<string, string>> {
  const { ui } = palette;
  const vars: Record<string, string> = {
    '--nt-paper': ui.paper, '--nt-ink': ui.ink, '--nt-panel': ui.panel, '--nt-border': ui.border,
    '--nt-accent': ui.accent, '--nt-danger': ui.danger, '--nt-focus': ui.focus,
    '--nt-unsubscribed': palette.unsubscribed.css,
  };
  for (const color of COLORS) vars[`--nt-paper-${color}`] = palette.paper[color].css;
  return vars;
}

/** Sets --nt-* CSS custom properties on root (UI tokens derive from the same palette object). */
export function applyPaletteCssVariables(root: HTMLElement, palette: PresentationPalette): void {
  for (const [name, value] of Object.entries(paletteCssVariables(palette))) root.style.setProperty(name, value);
}
