// Time of day for the town (owner: Claude; presentation interface §5c). Derived only from authoritative round and
// phase, never from a clock. Codex applies the look to the scene lights; Claude's lamps take lampLevel.
import type { Phase } from '../../shared/ids.ts';
import { TIME_TINTS, type PresentationPalette } from './palette.ts';

export const TIMES_OF_DAY = ['morning', 'midday', 'afternoon', 'late', 'dusk', 'night'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export interface TimeOfDayLook {
  sky: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  /** Multiplier on the approved hemisphere 1.1 and directional 2.4 intensities. */
  lightScale: number;
  /** 0..1, for TownBuildings.setLampLevel. */
  lampLevel: number;
}

const ROUND_TIMES: readonly TimeOfDay[] = ['morning', 'midday', 'afternoon', 'late', 'dusk'];

export function timeOfDay(round: number, phase: Phase): TimeOfDay {
  if (phase === 'final' || phase === 'ended') return 'night';
  if (phase === 'intro') return 'morning';
  return ROUND_TIMES[Math.min(Math.max(round, 1), ROUND_TIMES.length) - 1]!;
}

/** Channel-wise blend of two 0xRRGGBB colors; t = 0 gives a, t = 1 gives b. */
function mix(a: number, b: number, t: number): number {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const ca = (a >> shift) & 255;
    const cb = (b >> shift) & 255;
    out |= Math.round(ca + (cb - ca) * t) << shift;
  }
  return out;
}

// Per time: how far sky/fog move toward the tint, which tint, the sun color, light scale and lamp level.
const LOOKS: Readonly<Record<TimeOfDay, { tint: keyof typeof TIME_TINTS; amount: number; sun: keyof typeof TIME_TINTS; sunAmount: number; lightScale: number; lampLevel: number }>> = {
  morning: { tint: 'morning', amount: 0.3, sun: 'morning', sunAmount: 1, lightScale: 0.95, lampLevel: 0 },
  midday: { tint: 'daylight', amount: 0, sun: 'daylight', sunAmount: 1, lightScale: 1, lampLevel: 0 },
  afternoon: { tint: 'dusk', amount: 0.12, sun: 'dusk', sunAmount: 0.15, lightScale: 0.95, lampLevel: 0 },
  late: { tint: 'dusk', amount: 0.3, sun: 'dusk', sunAmount: 0.35, lightScale: 0.85, lampLevel: 0.25 },
  dusk: { tint: 'dusk', amount: 0.55, sun: 'dusk', sunAmount: 0.7, lightScale: 0.72, lampLevel: 0.7 },
  night: { tint: 'night', amount: 0.78, sun: 'moon', sunAmount: 1, lightScale: 0.6, lampLevel: 1 },
};

export function timeOfDayLook(palette: PresentationPalette, time: TimeOfDay): TimeOfDayLook {
  const look = LOOKS[time];
  const tint = TIME_TINTS[look.tint];
  const { sky, fog, ground } = palette.town;
  return {
    sky: mix(sky, tint, look.amount),
    fog: mix(fog, tint, look.amount),
    hemiSky: mix(sky, tint, look.amount),
    hemiGround: mix(ground, tint, look.amount / 2),
    sun: mix(TIME_TINTS.daylight, TIME_TINTS[look.sun], look.sunAmount),
    lightScale: look.lightScale,
    lampLevel: look.lampLevel,
  };
}
