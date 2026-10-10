import { COLORS, LOCATIONS, PERSONALITIES, type Color, type Controller, type Personality } from '../shared/ids.ts';
import { HOME_NODES } from '../shared/town-map.ts';
import { TUNING } from '../shared/tuning.ts';
import { stream } from './rng.ts';
import type { Citizen, MatchConfig, MatchState, Seat, SeatInit } from './state.ts';

function newSeat(seatId: number, displayName: string, paperName: string, color: Color, personality: Personality | null, controller: Controller): Seat {
  return {
    seatId, displayName, paperName, color, personality, controller, trust: TUNING.trust.start, readers: [],
    tip: null, evidence: [], proofs: [], investigations: [], acted: controller !== 'human', lockedVisibleAtMs: null,
  };
}

export function createMatch(config: MatchConfig, seed: number, seats: readonly SeatInit[]): MatchState {
  if (seats.length !== TUNING.seats) throw new Error(`a match needs exactly ${TUNING.seats} seats`);
  const humanColors = seats.flatMap((s) => (s.kind === 'human' ? [s.color] : []));
  if (new Set(humanColors).size !== humanColors.length) throw new Error('two humans picked the same color');
  const freeColors = COLORS.filter((c) => !humanColors.includes(c));

  let bots = 0;
  const built = seats.map((init, seatId): Seat => {
    if (init.kind === 'human') return newSeat(seatId, init.displayName, init.paperName, init.color, null, 'human');
    const personality = PERSONALITIES[bots % PERSONALITIES.length]!;
    const color = freeColors[bots]!;
    bots++;
    return newSeat(seatId, 'AI editor', config.content.botPapers[personality], color, personality, 'bot');
  });

  const rng = stream(seed, 'citizens');
  const { min, max } = TUNING.gullibility;
  const citizens = Array.from({ length: TUNING.citizens }, (_, id): Citizen => ({
    id,
    home: rng.pick(HOME_NODES),
    favorite: rng.pick(LOCATIONS),
    gullibility: Math.round((min + rng.next() * (max - min)) * 100) / 100,
    paper: null,
  }));

  return {
    version: 1, seed, content: config.content, round: 0, phase: 'intro',
    deadlineMs: config.startMs + TUNING.phaseMs.intro,
    seats: built, citizens, events: [[]], headlines: [], exposures: [], reactionPlan: null, final: null,
  };
}
