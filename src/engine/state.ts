import type { Rating } from '../shared/ai.ts';
import type { EngineContent } from '../shared/content-schema.ts';
import type { Claim, Color, Controller, ErrorCode, EventClaim, Location, Personality, Phase, SeatId } from '../shared/ids.ts';
import type { EvidenceCard, Exposure, FinalResult, InvestigationResult, ProofCard, ReactionPlan, Tip } from '../shared/snapshots.ts';

export interface MatchConfig { content: EngineContent; startMs: number }

/** One entry per seat, index = seat id. Bots get names and colors from the engine. */
export type SeatInit = { kind: 'human'; displayName: string; paperName: string; color: Color } | { kind: 'bot' };

export interface TownEvent { templateId: string; location: Location; claim: EventClaim; real: boolean }

export interface Headline {
  id: string;
  seatId: SeatId;
  round: number;
  /** For an expose: the exposed headline's location. */
  location: Location;
  claim: Claim;
  exposeOf: string | null;
  text: string;
  evidence: boolean;
  isTrue: boolean;
  /** Written by a bot or the Caretaker: AI text may replace it before reveal. */
  botAuthored: boolean;
  /** Personality whose fallback rating applies; null for humans. Caretaker = 'gazette'. */
  authorPersonality: Personality | null;
  rating: Rating | null;
  revealed: boolean;
  exposedRound: number | null;
}

export interface Seat {
  seatId: SeatId;
  displayName: string;
  paperName: string;
  color: Color;
  /** null for human seats (also while the Caretaker plays them). */
  personality: Personality | null;
  controller: Controller;
  trust: number;
  /** Readers after each reveal, index = round - 1. */
  readers: number[];
  tip: Tip | null;
  evidence: EvidenceCard[];
  proofs: ProofCard[];
  investigations: InvestigationResult[];
  acted: boolean;
  lockedVisibleAtMs: number | null;
}

export interface Citizen { id: number; home: string; favorite: Location; gullibility: number; paper: SeatId | null }

export interface MatchState {
  version: number;
  seed: number;
  content: EngineContent;
  /** 0 during the intro, 1–5 in rounds; stays 5 in the Final Edition. */
  round: number;
  phase: Phase;
  deadlineMs: number;
  seats: Seat[];
  citizens: Citizen[];
  /** Town events per round; index 0 is unused. Hidden truth: never in a snapshot. */
  events: TownEvent[][];
  /** Sorted by round, then seat. */
  headlines: Headline[];
  exposures: Exposure[];
  reactionPlan: ReactionPlan | null;
  final: FinalResult | null;
}

export type EngineEvent =
  | { type: 'phaseStarted'; round: number; phase: Phase; deadlineMs: number }
  | {
      type: 'headlineLocked'; headlineId: string; seatId: SeatId; text: string; location: Location; claim: Claim;
      exposedHeadlineText?: string;
      /** Non-null: bot or Caretaker headline — ask the AI to write text, then rate it. */
      botPersonality: Personality | null;
    }
  | { type: 'matchEnded' };

export type CommandResult = { ok: true } | { ok: false; error: ErrorCode };
export interface CommandOutcome { state: MatchState; result: CommandResult; events: EngineEvent[] }
