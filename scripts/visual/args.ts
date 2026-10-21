import { APPROVED_PALETTE } from '../../src/client/visuals/palette.ts';
import type { CrowdLayout } from '../../src/client/visual-test/crowd.ts';
import { ARCHITECTURE_VARIANTS, ARCHITECTURE_VIEWS, type ArchitectureScenario } from '../../src/client/visual-test/architecture-scenario.ts';
import { TIMES_OF_DAY } from '../../src/client/visuals/time-of-day.ts';

export type CaptureTarget = 'town' | 'app' | 'character' | 'architecture' | 'crowd';
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
  /** --target architecture only: time-of-day look preview. */
  time: ArchitectureScenario['time'];
  /** --target crowd only: requested citizen height (0.5 to 6). */
  citizenHeight: number | null;
  /** --target crowd only: Codex's comparison rows (default, reproduces the approved screenshot) or its production allocator. */
  crowdLayout: CrowdLayout;
  /** --target town or app only: launch Chromium without WebGL to capture the real fallback. */
  noWebgl: boolean;
  /** --target town only: lose and restore the real WebGL context after readiness, then capture the restored frame. */
  contextCycle: boolean;
  /** Live lobby only: test input for the create-room form (null keeps the default). Typed with page.fill, never as HTML. */
  playerName: string | null;
  paperName: string | null;
  /** Live lobby only: name resubmitted after the server rejects --player-name. */
  correctPlayerName: string | null;
  /** Live lobby only: name resubmitted after the server rejects --paper-name. */
  correctPaperName: string | null;
  /** Live lobby only: text the join error banner must contain to count as a rejection. */
  expectError: string | null;
}

const SWIFTSHADER_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

/** Software WebGL for normal captures; no ANGLE at all, and WebGL disabled, for --no-webgl. */
export function chromiumArgs(noWebgl: boolean): string[] {
  return noWebgl ? ['--disable-webgl', '--disable-3d-apis'] : SWIFTSHADER_ARGS;
}

const DEFAULTS: Omit<CaptureOptions, 'out'> = {
  target: 'town', fixture: 'solo-honest', round: 1, phase: 'reveal', reactionMs: 6000,
  reducedMotion: false, seed: 1, width: 1280, height: 720, prod: false, timeoutMs: 60000,
  model: 'characters/kenney-mini/character-male-a.glb', clip: null, timeMs: 0, count: 1,
  screen: 'home', palette: APPROVED_PALETTE, stressText: false, tab: 0, scroll: null, blockFonts: false,
  variant: 'code', view: 'street', time: null, citizenHeight: null, crowdLayout: 'comparison', noWebgl: false, contextCycle: false,
  playerName: null, paperName: null, correctPlayerName: null,
  correctPaperName: null, expectError: null,
};

const NAME_FLAGS = { '--player-name': 'playerName', '--paper-name': 'paperName', '--correct-player-name': 'correctPlayerName',
  '--correct-paper-name': 'correctPaperName', '--expect-error': 'expectError' } as const;

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
  let crowdLayoutGiven = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flag === '--reduced-motion') { options.reducedMotion = true; continue; }
    if (flag === '--prod') { options.prod = true; continue; }
    if (flag === '--stress-text') { options.stressText = true; continue; }
    if (flag === '--block-fonts') { options.blockFonts = true; continue; }
    if (flag === '--no-webgl') { options.noWebgl = true; continue; }
    if (flag === '--context-cycle') { options.contextCycle = true; continue; }
    const value = argv[i + 1];
    if (flag in NUMBER_FLAGS) {
      options[NUMBER_FLAGS[flag as keyof typeof NUMBER_FLAGS]] = wholeNumber(flag, value);
      i++;
      continue;
    }
    if (flag in NAME_FLAGS) {
      if (value === undefined || value.trim() === '') throw new Error(`${flag} needs a non-empty value`);
      options[NAME_FLAGS[flag as keyof typeof NAME_FLAGS]] = value;
    } else if (flag === '--target') {
      if (value !== 'town' && value !== 'app' && value !== 'character' && value !== 'architecture' && value !== 'crowd') {
        throw new Error(`--target must be town, app, character, architecture or crowd, got "${value ?? ''}"`);
      }
      options.target = value;
    } else if (flag === '--crowd-layout') {
      if (value !== 'comparison' && value !== 'production') throw new Error(`--crowd-layout must be comparison or production, got "${value ?? ''}"`);
      options.crowdLayout = value;
      crowdLayoutGiven = true;
    } else if (flag === '--citizen-height') {
      const height = value !== undefined && /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
      if (!(height >= 0.5 && height <= 6)) throw new Error(`--citizen-height must be a number between 0.5 and 6, got "${value ?? ''}"`);
      options.citizenHeight = height;
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
    } else if (flag === '--time') {
      const time = TIMES_OF_DAY.find((t) => t === value);
      if (!time) throw new Error(`--time must be one of ${TIMES_OF_DAY.join(', ')}, got "${value ?? ''}"`);
      options.time = time;
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
  if (architectureOnly && options.target !== 'architecture') throw new Error('--variant, --view and --time need --target architecture');
  if (options.target === 'crowd' && options.citizenHeight === null) throw new Error('--citizen-height is required with --target crowd');
  if (options.target !== 'crowd' && options.citizenHeight !== null) throw new Error('--citizen-height needs --target crowd');
  if (crowdLayoutGiven && options.target !== 'crowd') throw new Error('--crowd-layout needs --target crowd');
  if (options.contextCycle && options.target !== 'town') throw new Error('--context-cycle supports only --target town');
  if (options.contextCycle && options.noWebgl) throw new Error('--context-cycle needs WebGL; drop --no-webgl');
  if (options.noWebgl && options.target !== 'town' && options.target !== 'app') throw new Error('--no-webgl supports only --target town or app');
  const live = options.target === 'app' && LIVE_SCREENS.includes(options.screen);
  if (options.noWebgl && live) throw new Error('--no-webgl does not apply to live screens (the real app URL never carries it); use a harness screen or --target town');
  const nameFlags = [options.playerName, options.paperName, options.correctPlayerName, options.correctPaperName, options.expectError];
  if (nameFlags.some((v) => v !== null) && !(options.target === 'app' && options.screen === 'lobby')) {
    throw new Error('--player-name, --paper-name, --correct-player-name, --correct-paper-name and --expect-error need --target app --screen lobby');
  }
  if (options.stressText && (options.playerName ?? options.paperName) !== null) throw new Error('--stress-text cannot be combined with --player-name or --paper-name');
  if (options.correctPlayerName !== null && options.playerName === null) throw new Error('--correct-player-name needs --player-name');
  if (options.correctPaperName !== null && options.paperName === null) throw new Error('--correct-paper-name needs --paper-name');
  if (options.expectError !== null && options.playerName === null && options.paperName === null) throw new Error('--expect-error needs --player-name or --paper-name');
  if (options.prod && options.target !== 'app') throw new Error('--prod only supports --target app (the town harness is dev-only)');
  if (options.prod && options.screen !== 'home') throw new Error('--prod supports only --screen home (the UI harness is dev-only)');
  if (options.target === 'app' && LIVE_SCREENS.includes(options.screen) && options.palette !== APPROVED_PALETTE) {
    throw new Error(`live screens render the production palette (${APPROVED_PALETTE}); --palette ${options.palette} applies only to harness screens`);
  }
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
    if (options.time !== null) query.set('time', options.time);
    return `/visual-test/index.html?${query.toString()}`;
  }
  if (options.target === 'crowd') {
    const query = new URLSearchParams({
      scene: 'crowd', height: String(options.citizenHeight), palette: options.palette, reactionMs: String(options.reactionMs),
      seed: String(options.seed), layout: options.crowdLayout,
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
  if (options.noWebgl) query.set('noWebgl', 'true');
  if (options.contextCycle) query.set('contextCycle', 'true');
  if (options.target === 'app') {
    query.set('screen', options.screen);
    query.set('palette', options.palette);
    query.set('stressText', String(options.stressText));
    return `/visual-test/app.html?${query.toString()}`;
  }
  query.set('palette', options.palette);
  return `/visual-test/index.html?${query.toString()}`;
}
