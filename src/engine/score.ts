import { TUNING } from '../shared/tuning.ts';
import type { Seat } from './state.ts';

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** score = round(totalReaders × trust / 50) */
export const scoreOf = (seat: Seat): number => Math.round((sum(seat.readers) * seat.trust) / TUNING.scoreTrustDivisor);
