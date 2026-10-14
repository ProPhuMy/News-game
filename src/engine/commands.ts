import type { ErrorCode, Phase } from '../shared/ids.ts';
import type { MatchCommand } from '../shared/protocol.ts';
import { runBotTurns } from './bot-turns.ts';
import { investigate } from './investigate.ts';
import { lockHeadline } from './write.ts';
import type { CommandOutcome, EngineEvent, MatchState, Seat } from './state.ts';

type PlayerCommand = Exclude<MatchCommand, { type: 'connection' }>;

const COMMAND_PHASE = {
  skipIntro: 'intro',
  investigate: 'investigate',
  skipInvestigate: 'investigate',
  lockHeadline: 'write',
  skipWrite: 'write',
} as const satisfies Record<PlayerCommand['type'], Phase>;

const reject = (state: MatchState, error: ErrorCode): CommandOutcome => ({ state, result: { ok: false, error }, events: [] });

/** Returns an error code, or null on success. May mutate `s` only when it succeeds. */
function perform(s: MatchState, seat: Seat, command: PlayerCommand, nowMs: number, events: EngineEvent[]): ErrorCode | null {
  switch (command.type) {
    case 'investigate':
      return investigate(s, seat, command.target);
    case 'lockHeadline':
      return lockHeadline(s, seat, command.story, command.text, nowMs, events);
    default:
      return null; // skips
  }
}

function setConnection(state: MatchState, seatId: number, connected: boolean, nowMs: number): CommandOutcome {
  const seat = state.seats[seatId]!;
  if (seat.personality !== null) return reject(state, 'NOT_ALLOWED');
  const controller = connected ? 'human' : 'caretaker';
  if (seat.controller === controller) return { state, result: { ok: true }, events: [] };
  const s = structuredClone(state);
  s.seats[seatId]!.controller = controller;
  const events: EngineEvent[] = [];
  // The Caretaker acts at once if the seat hasn't acted — but never in a phase whose deadline has passed.
  if (!connected && nowMs < state.deadlineMs) runBotTurns(s, nowMs, events);
  s.version++;
  return { state: s, result: { ok: true }, events };
}

/** Validate and apply one seat's command. A rejected command returns the original state object. */
export function applyCommand(state: MatchState, seatId: number, command: MatchCommand, nowMs: number): CommandOutcome {
  const seat = state.seats[seatId];
  if (!seat) return reject(state, 'NOT_ALLOWED');
  if (command.type === 'connection') return setConnection(state, seatId, command.connected, nowMs);
  if (seat.controller !== 'human') return reject(state, 'NOT_ALLOWED');
  if (command.round !== state.round || command.phase !== state.phase || COMMAND_PHASE[command.type] !== state.phase) {
    return reject(state, 'STALE_PHASE');
  }
  // The phase ends at its deadline even if no tick has run yet (spec §4.3: nothing is published after the timer).
  if (nowMs >= state.deadlineMs) return reject(state, 'STALE_PHASE');
  if (seat.acted) return reject(state, 'ALREADY_ACTED');

  const s = structuredClone(state);
  const me = s.seats[seatId]!;
  const events: EngineEvent[] = [];
  const error = perform(s, me, command, nowMs, events);
  if (error) return reject(state, error);
  me.acted = true;
  s.version++;
  return { state: s, result: { ok: true }, events };
}
