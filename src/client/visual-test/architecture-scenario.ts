// Architecture sample scenario (C2): which bakery variant, camera view and palette the harness renders.
import type { PaletteId } from '../visuals/palette.ts';
import { readInt } from './scenario.ts';

export const ARCHITECTURE_VARIANTS = ['code', 'hybrid-original', 'hybrid-palette'] as const;
export const ARCHITECTURE_VIEWS = ['street', 'awning'] as const;
const PALETTE_IDS: readonly PaletteId[] = ['a', 'b', 'c'];

export interface ArchitectureScenario {
  variant: (typeof ARCHITECTURE_VARIANTS)[number];
  view: (typeof ARCHITECTURE_VIEWS)[number];
  palette: PaletteId;
  seed: number;
}

function oneOf<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const found = allowed.find((value) => value === raw);
  if (!found) throw new Error(`${key} must be one of ${allowed.join(', ')}, got "${raw}"`);
  return found;
}

export function parseArchitectureScenario(search: string): ArchitectureScenario {
  const params = new URLSearchParams(search);
  return {
    variant: oneOf(params, 'variant', ARCHITECTURE_VARIANTS, 'code'),
    view: oneOf(params, 'view', ARCHITECTURE_VIEWS, 'street'),
    palette: oneOf(params, 'palette', PALETTE_IDS, 'a'),
    seed: readInt(params, 'seed', 1, 0, 2 ** 31 - 1),
  };
}
