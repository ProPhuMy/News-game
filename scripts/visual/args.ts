import { ARCHITECTURE_VARIANTS, ARCHITECTURE_VIEWS, type ArchitectureScenario } from '../../src/client/visual-test/architecture-scenario.ts';

export type CaptureTarget = 'town' | 'app' | 'character' | 'architecture';
export const APP_SCREENS = ['home', 'join', 'lobby', 'match', 'loading', 'disconnected', 'error'] as const;
export type AppScreen = (typeof APP_SCREENS)[number];
/** Screens driven on the real dev server; the rest come from the fixture-fed UI harness. */
export const LIVE_SCREENS: readonly AppScreen[] = ['home', 'join', 'lobby'];
const PALETTE_IDS = ['a', 'b', 'c'] as const;

export interface CaptureOptions {
  target: CaptureTarget;
  fixture: string;
  round: number;
  phase: string;
  reactionMs: number;
  reducedMotion: boolean;
  seed: number;
  width: number;
  height: number;
  out: string;
  prod: boolean;
  timeoutMs: number;
  /** --target character only: model path under public/models/. */
  model: string;
  /** --target character only: clip name, or null for the bind pose. */
  clip: string | null;
  /** --target character only: exact clip time in ms. */
  timeMs: number;
  /** --target character only: number of characters the scene must draw. */
  count: number;
  /** --target app only: which screen to capture. */
  screen: AppScreen;
  /** Presentation palette preview (app: applied; town: passed to the harness for D1). */
  palette: (typeof PALETTE_IDS)[number];
  /** Harness/capture only: replace names and headlines with schema-maximum text. */
  stressText: boolean;
  /** Tab presses before capture, to show keyboard focus. */
  tab: number;
  /** CSS selector scrolled to its end before capture. */
  scroll: string | null;
  /** Abort /fonts/ requests, to check the fallback fonts. */
  blockFonts: boolean;
  /** --target architecture only: which bakery variant to render. */
  variant: ArchitectureScenario['variant'];
  /** --target architecture only: camera view. */
  view: ArchitectureScenario['view'];
}

const DEFAULTS: Omit<CaptureOptions, 'out'> = {
  target: 'town', fixture: 'solo-honest', round: 1, phase: 'reveal', reactionMs: 6000,
  reducedMotion: false, seed: 1, width: 1280, height: 720, prod: false, timeoutMs: 60000,
  model: 'characters/kenney-mini/character-male-a.glb', clip: null, timeMs: 0, count: 1,
  screen: 'home', palette: 'a', stressText: false, tab: 0, scroll: null, blockFonts: false,
  variant: 'code', view: 'street',
};

const NUMBER_FLAGS = {
  '--round': 'round', '--reaction-ms': 'reactionMs', '--seed': 'seed',
  '--width': 'width', '--height': 'height', '--timeout-ms': 'timeoutMs',
  '--time-ms': 'timeMs', '--count': 'count', '--tab': 'tab',
} as const;

function wholeNumber(flag: string, raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw)) throw new Error(`${flag} must be a whole number, got "${raw ?? ''}"`);
  return Number(raw);
}

export function parseCaptureArgs(argv: readonly string[]): CaptureOptions {
  const options: Omit<CaptureOptions, 'out'> & { out?: string } = { ...DEFAULTS };
  let architectureOnly = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flag === '--reduced-motion') { options.reducedMotion = true; continue; }
    if (flag === '--prod') { options.prod = true; continue; }
    if (flag === '--stress-text') { options.stressText = true; continue; }
    if (flag === '--block-fonts') { options.blockFonts = true; continue; }
    const value = argv[i + 1];
    if (flag in NUMBER_FLAGS) {
      options[NUMBER_FLAGS[flag as keyof typeof NUMBER_FLAGS]] = wholeNumber(flag, value);
      i++;
      continue;
    }
    if (flag === '--target') {
      if (value !== 'town' && value !== 'app' && value !== 'character' && value !== 'architecture') {
        throw new Error(`--target must be town, app, character or architecture, got "${value ?? ''}"`);
      }
      options.target = value;
    } else if (flag === '--fixture') {
      options.fixture = value ?? '';
    } else if (flag === '--phase') {
      options.phase = value ?? '';
    } else if (flag === '--model') {
      options.model = value ?? '';
    } else if (flag === '--clip') {
      options.clip = value ?? '';
    } else if (flag === '--screen') {
      const screen = APP_SCREENS.find((s) => s === value);
      if (!screen) throw new Error(`--screen must be one of ${APP_SCREENS.join(', ')}, got "${value ?? ''}"`);
      options.screen = screen;
    } else if (flag === '--palette') {
      const palette = PALETTE_IDS.find((p) => p === value);
      if (!palette) throw new Error(`--palette must be a, b or c, got "${value ?? ''}"`);
      options.palette = palette;
    } else if (flag === '--variant') {
      const variant = ARCHITECTURE_VARIANTS.find((v) => v === value);
      if (!variant) throw new Error(`--variant must be one of ${ARCHITECTURE_VARIANTS.join(', ')}, got "${value ?? ''}"`);
      options.variant = variant;
      architectureOnly = true;
    } else if (flag === '--view') {
      const view = ARCHITECTURE_VIEWS.find((v) => v === value);
      if (!view) throw new Error(`--view must be one of ${ARCHITECTURE_VIEWS.join(', ')}, got "${value ?? ''}"`);
      options.view = view;
      architectureOnly = true;
    } else if (flag === '--scroll') {
      if (!value) throw new Error('--scroll needs a CSS selector');
      options.scroll = value;
    } else if (flag === '--out') {
      options.out = value;
    } else {
      throw new Error(`unknown flag ${flag}`);
    }
    i++;
  }
  if (!options.out) throw new Error('--out <file.png> is required');
  if (!options.out.endsWith('.png')) throw new Error('--out must end with .png');
  if (architectureOnly && options.target !== 'architecture') throw new Error('--variant and --view need --target architecture');
  if (options.prod && options.target !== 'app') throw new Error('--prod only supports --target app (the town harness is dev-only)');
  if (options.prod && options.screen !== 'home') throw new Error('--prod supports only --screen home (the UI harness is dev-only)');
  return { ...options, out: options.out };
}

export function harnessPath(options: CaptureOptions): string {
  if (options.target === 'character') {
    // The harness re-validates model, clip, time and count and reports readable errors.
    const query = new URLSearchParams({ scene: 'inspect-character', model: options.model });
    if (options.clip !== null) query.set('clip', options.clip);
    query.set('timeMs', String(options.timeMs));
    query.set('count', String(options.count));
    query.set('seed', String(options.seed));
    return `/visual-test/index.html?${query.toString()}`;
  }
  if (options.target === 'architecture') {
    const query = new URLSearchParams({
      scene: 'architecture', variant: options.variant, view: options.view, palette: options.palette, seed: String(options.seed),
      reactionMs: String(options.reactionMs), reducedMotion: String(options.reducedMotion),
    });
    return `/visual-test/index.html?${query.toString()}`;
  }
  if (options.target === 'app' && LIVE_SCREENS.includes(options.screen)) return '/';
  const query = new URLSearchParams({
    fixture: options.fixture,
    round: String(options.round),
    phase: options.phase,
    reactionMs: String(options.reactionMs),
    reducedMotion: String(options.reducedMotion),
    seed: String(options.seed),
  });
  if (options.target === 'app') {
    query.set('screen', options.screen);
    query.set('palette', options.palette);
    query.set('stressText', String(options.stressText));
    return `/visual-test/app.html?${query.toString()}`;
  }
  query.set('palette', options.palette);
  return `/visual-test/index.html?${query.toString()}`;
}
