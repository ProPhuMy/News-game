import { z } from 'zod';
import { BEHAVIORS, CONTROLLERS, EVENT_CLAIMS, PERSONALITIES } from './ids.ts';
import {
  ClaimSchema, ColorSchema, HeadlineIdSchema, InvestigateTargetSchema, LocationSchema, PhaseSchema,
  SeatIdSchema, StorySchema, TownClaimSchema,
} from './protocol.ts';
import { TUNING } from './tuning.ts';

const int = z.number().int();
const BehaviorSchema = z.enum(BEHAVIORS);

export const ExposureSchema = z.object({
  headlineId: HeadlineIdSchema,
  /** The exposed paper. */
  seatId: SeatIdSchema,
  /** Round it was exposed in; rounds + 1 for the Final Edition. */
  round: int,
  source: z.enum(['player', 'town', 'final']),
  exposers: z.array(SeatIdSchema),
  trustDelta: int,
  explanation: z.string(),
});
export type Exposure = z.infer<typeof ExposureSchema>;

/** One citizen's part of the reveal animation. `route` starts at the citizen's home node. */
export const ReactionEntrySchema = z.object({
  citizenId: int.min(0),
  behavior: BehaviorSchema,
  route: z.array(z.string()).min(1),
  fromPaper: SeatIdSchema.nullable(),
  toPaper: SeatIdSchema.nullable(),
  bubble: z.string().nullable(),
});
export type ReactionEntry = z.infer<typeof ReactionEntrySchema>;

/** Data for the one-line recap: "9 citizens rushed the Bank; 3 now read The Daily Gasp". */
export const RecapSchema = z.object({
  headlineId: HeadlineIdSchema.nullable(),
  location: LocationSchema.nullable(),
  behavior: BehaviorSchema,
  reactors: int,
  gainSeatId: SeatIdSchema.nullable(),
  gained: int,
});
export type Recap = z.infer<typeof RecapSchema>;

export const ReactionPlanSchema = z.object({
  round: int,
  exposures: z.array(ExposureSchema),
  citizens: z.array(ReactionEntrySchema),
  recap: RecapSchema,
});
export type ReactionPlan = z.infer<typeof ReactionPlanSchema>;

export const PaperPublicSchema = z.object({
  seatId: SeatIdSchema,
  displayName: z.string(),
  paperName: z.string(),
  color: ColorSchema,
  personality: z.enum(PERSONALITIES).nullable(),
  controller: z.enum(CONTROLLERS),
  trust: z.number(),
  readers: int,
  totalReaders: int,
  score: int,
  /** Write phase only: show the "locked" indicator once server time passes this. */
  lockedVisibleAtMs: z.number().nullable(),
});
export type PaperPublic = z.infer<typeof PaperPublicSchema>;

export const HeadlinePublicSchema = z.object({
  id: HeadlineIdSchema,
  seatId: SeatIdSchema,
  round: int,
  location: LocationSchema,
  claim: ClaimSchema,
  exposeOf: HeadlineIdSchema.nullable(),
  /** PULLED_TEXT when pulled. */
  text: z.string(),
  pulled: z.boolean(),
  evidence: z.boolean(),
  exposed: z.boolean(),
  truth: z.enum(['true', 'lie', 'unknown']),
});
export type HeadlinePublic = z.infer<typeof HeadlinePublicSchema>;

export const CitizenPublicSchema = z.object({ id: int, home: z.string(), paper: SeatIdSchema.nullable() });
export type CitizenPublic = z.infer<typeof CitizenPublicSchema>;

export const TruthRecordSchema = z.object({ seatId: SeatIdSchema, liesTold: int, liesCaught: int, liesEscaped: int });
export type TruthRecord = z.infer<typeof TruthRecordSchema>;

export const FinalResultSchema = z.object({
  exposures: z.array(ExposureSchema),
  trustBonuses: z.array(z.object({ seatId: SeatIdSchema, amount: int })),
  records: z.array(TruthRecordSchema),
  winners: z.array(SeatIdSchema).min(1),
});
export type FinalResult = z.infer<typeof FinalResultSchema>;

export const PublicSnapshotSchema = z.object({
  version: int,
  round: int,
  phase: PhaseSchema,
  deadlineMs: z.number(),
  papers: z.array(PaperPublicSchema).length(TUNING.seats),
  /** Revealed headlines only. */
  headlines: z.array(HeadlinePublicSchema),
  exposures: z.array(ExposureSchema),
  reactionPlan: ReactionPlanSchema.nullable(),
  citizens: z.array(CitizenPublicSchema),
  final: FinalResultSchema.nullable(),
});
export type PublicSnapshot = z.infer<typeof PublicSnapshotSchema>;

export const TipSchema = z.object({ round: int, location: LocationSchema, claim: z.enum(EVENT_CLAIMS), text: z.string() });
export type Tip = z.infer<typeof TipSchema>;

export const EvidenceCardSchema = z.object({ round: int, location: LocationSchema, claim: TownClaimSchema, text: z.string() });
export type EvidenceCard = z.infer<typeof EvidenceCardSchema>;

export const ProofCardSchema = z.object({ headlineId: HeadlineIdSchema, round: int });
export type ProofCard = z.infer<typeof ProofCardSchema>;

export const InvestigationResultSchema = z.object({
  round: int,
  target: InvestigateTargetSchema,
  /** 'nothing' reads "Nothing conclusive" for both true headlines and failed rolls. */
  outcome: z.enum(['evidence', 'proof', 'nothing']),
});
export type InvestigationResult = z.infer<typeof InvestigationResultSchema>;

export const LockedHeadlineSchema = z.object({ id: HeadlineIdSchema, story: StorySchema, text: z.string() });
export type LockedHeadline = z.infer<typeof LockedHeadlineSchema>;

export const PrivateSnapshotSchema = z.object({
  version: int,
  seatId: SeatIdSchema,
  tip: TipSchema.nullable(),
  evidence: z.array(EvidenceCardSchema),
  /** Only proofs whose headline is still unexposed. */
  proofs: z.array(ProofCardSchema),
  investigations: z.array(InvestigationResultSchema),
  /** This seat already acted (or skipped) in the current phase. */
  acted: z.boolean(),
  lockedHeadline: LockedHeadlineSchema.nullable(),
});
export type PrivateSnapshot = z.infer<typeof PrivateSnapshotSchema>;
