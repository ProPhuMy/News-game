export type CaptureTarget = 'town' | 'app';

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
}

const DEFAULTS: Omit<CaptureOptions, 'out'> = {
  target: 'town', fixture: 'solo-honest', round: 1, phase: 'reveal', reactionMs: 6000,
  reducedMotion: false, seed: 1, width: 1280, height: 720, prod: false, timeoutMs: 60000,
};

const NUMBER_FLAGS = {
  '--round': 'round', '--reaction-ms': 'reactionMs', '--seed': 'seed',
  '--width': 'width', '--height': 'height', '--timeout-ms': 'timeoutMs',
} as const;

function wholeNumber(flag: string, raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw)) throw new Error(`${flag} must be a whole number, got "${raw ?? ''}"`);
  return Number(raw);
}

export function parseCaptureArgs(argv: readonly string[]): CaptureOptions {
  const options: Omit<CaptureOptions, 'out'> & { out?: string } = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flag === '--reduced-motion') { options.reducedMotion = true; continue; }
    if (flag === '--prod') { options.prod = true; continue; }
    const value = argv[i + 1];
    if (flag in NUMBER_FLAGS) {
      options[NUMBER_FLAGS[flag as keyof typeof NUMBER_FLAGS]] = wholeNumber(flag, value);
      i++;
      continue;
    }
    if (flag === '--target') {
      if (value !== 'town' && value !== 'app') throw new Error(`--target must be town or app, got "${value ?? ''}"`);
      options.target = value;
    } else if (flag === '--fixture') {
      options.fixture = value ?? '';
    } else if (flag === '--phase') {
      options.phase = value ?? '';
    } else if (flag === '--out') {
      options.out = value;
    } else {
      throw new Error(`unknown flag ${flag}`);
    }
    i++;
  }
  if (!options.out) throw new Error('--out <file.png> is required');
  if (!options.out.endsWith('.png')) throw new Error('--out must end with .png');
  if (options.prod && options.target !== 'app') throw new Error('--prod only supports --target app (the town harness is dev-only)');
  return { ...options, out: options.out };
}

export function harnessPath(options: CaptureOptions): string {
  const query = new URLSearchParams({
    fixture: options.fixture,
    round: String(options.round),
    phase: options.phase,
    reactionMs: String(options.reactionMs),
    reducedMotion: String(options.reducedMotion),
    seed: String(options.seed),
  });
  return `/visual-test/index.html?${query.toString()}`;
}
