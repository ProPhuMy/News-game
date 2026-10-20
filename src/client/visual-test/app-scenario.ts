import { APPROVED_PALETTE, type PaletteId } from '../visuals/palette.ts';
import { parseNoWebgl, parseScenario, type VisualScenario } from './scenario.ts';

export const HARNESS_SCREENS = ['match', 'loading', 'disconnected', 'error'] as const;
export type HarnessScreen = (typeof HARNESS_SCREENS)[number];

export interface AppScenario extends VisualScenario {
  /** match: the phase screen; loading: before the first snapshot; disconnected: overlay; error: a refused action. */
  screen: HarnessScreen;
  palette: PaletteId;
  stressText: boolean;
  noWebgl: boolean;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[], fallback: T, message: string): T {
  if (raw === null) return fallback;
  const found = allowed.find((value) => value === raw);
  if (found === undefined) throw new Error(`${message}, got "${raw}"`);
  return found;
}

export function parseAppScenario(search: string): AppScenario {
  const params = new URLSearchParams(search);
  const stress = params.get('stressText');
  if (stress !== null && stress !== 'true' && stress !== 'false') throw new Error(`stressText must be true or false, got "${stress}"`);
  return {
    ...parseScenario(search),
    screen: pick(params.get('screen'), HARNESS_SCREENS, 'match', `screen must be one of ${HARNESS_SCREENS.join(', ')}`),
    palette: pick<PaletteId>(params.get('palette'), ['a', 'b', 'c'], APPROVED_PALETTE, 'palette must be a, b or c'),
    stressText: stress === 'true',
    noWebgl: parseNoWebgl(search),
  };
}
