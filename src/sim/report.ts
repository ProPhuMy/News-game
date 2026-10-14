import type { EngineContent } from '../shared/content-schema.ts';
import { TUNING } from '../shared/tuning.ts';
import { runMatch } from './runner.ts';
import { HONEST, LIAR, MIXED, type Strategy } from './strategies.ts';

/** Spec §10: each strategy must win at least this share of matches. */
export const MIN_WIN_RATE = 0.15;

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
  const pass = crashes === 0 && [HONEST, LIAR, MIXED].every((st) => (winRate[st.name] ?? 0) >= MIN_WIN_RATE);
  return { matches, crashes, failures, wins, winRate, pass };
}
