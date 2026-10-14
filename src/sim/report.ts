import type { EngineContent } from '../shared/content-schema.ts';
import { TUNING } from '../shared/tuning.ts';
import { runMatch } from './runner.ts';
import { HONEST, LIAR, MIXED, type Strategy } from './strategies.ts';

/** Spec §10 balance targets (win shares over the rotating 4-seat lineup). */
export const TARGETS = { honestMax: 0.5, mixedMin: 0.2, liarMin: 0.1 } as const;

export function meetsTargets(winRate: Record<string, number>): boolean {
  return (winRate.honest ?? 0) <= TARGETS.honestMax && (winRate.mixed ?? 0) >= TARGETS.mixedMin && (winRate.liar ?? 0) >= TARGETS.liarMin;
}

export interface BalanceReport {
  matches: number;
  crashes: number;
  failures: string[];
  /** Shared wins count for every winner. */
  wins: Record<string, number>;
  winRate: Record<string, number>;
  pass: boolean;
}

export function balanceReport(matches: number, content: EngineContent): BalanceReport {
  const pool: (Strategy | null)[] = [HONEST, LIAR, MIXED, null];
  const wins: Record<string, number> = { honest: 0, liar: 0, mixed: 0, bot: 0 };
  const failures: string[] = [];
  let crashes = 0;

  for (let seed = 1; seed <= matches; seed++) {
    const lineup = pool.map((_, i) => pool[(i + seed) % pool.length] ?? null);
    try {
      const end = runMatch({ seed, content, lineup });
      if (end.seats.some((seat) => seat.readers.length !== TUNING.rounds)) throw new Error('match did not play every round');
      for (const seatId of end.final!.winners) {
        const name = lineup[seatId]?.name ?? 'bot';
        wins[name] = (wins[name] ?? 0) + 1;
      }
    } catch (err) {
      crashes++;
      if (failures.length < 5) failures.push(`seed ${seed}: ${String(err)}`);
    }
  }

  const winRate = Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v / matches]));
  const pass = crashes === 0 && meetsTargets(winRate);
  return { matches, crashes, failures, wins, winRate, pass };
}
