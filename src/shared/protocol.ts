import { z } from 'zod';
import { CLAIMS, COLORS, ERROR_CODES, LOCATIONS, PHASES, TOWN_CLAIMS } from './ids.ts';
import { TUNING } from './tuning.ts';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

/** Strip control characters, collapse whitespace, trim. Applied to every piece of user text. */
export function cleanText(raw: string): string {
  return raw.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

const userText = (max: number) => z.string().max(1_000).transform(cleanText).pipe(z.string().min(1).max(max));

export const HeadlineTextSchema = userText(TUNING.limits.headlineChars);
export const DisplayNameSchema = userText(TUNING.limits.displayNameChars);
export const PaperNameSchema = userText(TUNING.limits.paperNameChars);
export const RoomCodeSchema = z.string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().length(TUNING.limits.roomCodeLength).regex(new RegExp(`^[${TUNING.limits.roomCodeAlphabet}]+$`)));
/** 128-bit reconnect token, hex. */
export const TokenSchema = z.string().regex(/^[0-9a-f]{32}$/);
export const ActionIdSchema = z.string().min(1).max(64);
export const SeatIdSchema = z.number().int().min(0).max(TUNING.seats - 1);
/** `h{round}-{seatId}` */
export const HeadlineIdSchema = z.string().regex(/^h\d+-\d$/);
export const LocationSchema = z.enum(LOCATIONS);
export const TownClaimSchema = z.enum(TOWN_CLAIMS);
export const ClaimSchema = z.enum(CLAIMS);
export const PhaseSchema = z.enum(PHASES);
export const ColorSchema = z.enum(COLORS);
export const ErrorCodeSchema = z.enum(ERROR_CODES);

export const InvestigateTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('location'), location: LocationSchema }),
  z.object({ kind: z.literal('headline'), headlineId: HeadlineIdSchema }),
]);
export type InvestigateTarget = z.infer<typeof InvestigateTargetSchema>;

export const StorySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('claim'), location: LocationSchema, claim: TownClaimSchema, attachEvidence: z.boolean() }),
  z.object({ kind: z.literal('expose'), headlineId: HeadlineIdSchema }),
]);
export type Story = z.infer<typeof StorySchema>;

const action = { actionId: ActionIdSchema };
const inMatch = { ...action, round: z.number().int().min(0).max(TUNING.rounds + 1), phase: PhaseSchema };
const profile = { displayName: DisplayNameSchema, paperName: PaperNameSchema, color: ColorSchema };

/** Everything a client may send, on socket event CLIENT_EVENT. */
export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('createRoom'), ...action, ...profile }),
  z.object({ type: z.literal('playSolo'), ...action, ...profile }),
  z.object({ type: z.literal('joinRoom'), ...action, code: RoomCodeSchema, ...profile }),
  z.object({ type: z.literal('reconnect'), ...action, code: RoomCodeSchema, token: TokenSchema }),
  z.object({ type: z.literal('startMatch'), ...action }),
  z.object({ type: z.literal('skipIntro'), ...inMatch }),
  z.object({ type: z.literal('investigate'), ...inMatch, target: InvestigateTargetSchema }),
  z.object({ type: z.literal('skipInvestigate'), ...inMatch }),
  z.object({ type: z.literal('lockHeadline'), ...inMatch, story: StorySchema, text: HeadlineTextSchema }),
  z.object({ type: z.literal('skipWrite'), ...inMatch }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/** What the server passes to engine `applyCommand`. `connection` is server-only (disconnect / reconnect). */
export type MatchCommand =
  | Extract<ClientMessage, { type: 'skipIntro' | 'investigate' | 'skipInvestigate' | 'lockHeadline' | 'skipWrite' }>
  | { type: 'connection'; connected: boolean };

export const CLIENT_EVENT = 'cmd';
export const SERVER_EVENTS = { ack: 'ack', room: 'room', public: 'public', private: 'private' } as const;

/** Returned on createRoom / playSolo / joinRoom / reconnect. Client stores `token` in localStorage per room code. */
export const SessionSchema = z.object({ code: RoomCodeSchema, seatId: SeatIdSchema, token: TokenSchema });
export const AckSchema = z.object({
  actionId: ActionIdSchema,
  ok: z.boolean(),
  error: ErrorCodeSchema.optional(),
  session: SessionSchema.optional(),
});
export type Ack = z.infer<typeof AckSchema>;

/** Lobby and seat info, sent by the server on SERVER_EVENTS.room to each socket. */
export const RoomSnapshotSchema = z.object({
  code: RoomCodeSchema,
  status: z.enum(['lobby', 'playing', 'finished']),
  hostSeatId: SeatIdSchema.nullable(),
  you: SeatIdSchema,
  seats: z.array(z.object({
    seatId: SeatIdSchema,
    occupant: z.enum(['human', 'ai']),
    displayName: z.string().nullable(),
    paperName: z.string().nullable(),
    color: ColorSchema.nullable(),
    connected: z.boolean(),
  })).length(TUNING.seats),
});
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
