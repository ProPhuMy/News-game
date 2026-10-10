export const LOCATIONS = ['bakery', 'bank', 'fountain_square', 'town_hall', 'clinic'] as const;
export type Location = (typeof LOCATIONS)[number];

export const LOCATION_NAMES: Readonly<Record<Location, string>> = {
  bakery: 'Bakery',
  bank: 'Bank',
  fountain_square: 'Fountain Square',
  town_hall: 'Town Hall',
  clinic: 'Clinic',
};

/** Claims a town event can make real. */
export const EVENT_CLAIMS = ['danger', 'health_scare', 'scandal', 'great_deal', 'weird_sighting'] as const;
export type EventClaim = (typeof EVENT_CLAIMS)[number];

/** Claims a paper can make about a location. */
export const TOWN_CLAIMS = [...EVENT_CLAIMS, 'all_clear'] as const;
export type TownClaim = (typeof TOWN_CLAIMS)[number];

export const CLAIMS = [...TOWN_CLAIMS, 'expose'] as const;
export type Claim = (typeof CLAIMS)[number];

export const PHASES = ['intro', 'investigate', 'write', 'reveal', 'final', 'ended'] as const;
export type Phase = (typeof PHASES)[number];

export const PERSONALITIES = ['tabloid', 'gazette', 'wildcard'] as const;
export type Personality = (typeof PERSONALITIES)[number];

/** Who acts for a seat: a person, a bot paper, or the Caretaker for a disconnected person. */
export const CONTROLLERS = ['human', 'bot', 'caretaker'] as const;
export type Controller = (typeof CONTROLLERS)[number];

/** Seat index 0–3. Also indexes OFFICE_NODES. */
export type SeatId = number;

export const COLORS = ['red', 'blue', 'green', 'gold'] as const;
export type Color = (typeof COLORS)[number];

export const COLOR_ICONS: Readonly<Record<Color, 'quill' | 'megaphone' | 'eye' | 'lightning'>> = {
  red: 'quill',
  blue: 'megaphone',
  green: 'eye',
  gold: 'lightning',
};

export const BEHAVIORS = ['routine', 'flee', 'boycott', 'protest', 'queue', 'curious', 'relax', 'angry_mob'] as const;
export type Behavior = (typeof BEHAVIORS)[number];

export const CLAIM_BEHAVIOR: Readonly<Record<Claim, Behavior>> = {
  danger: 'flee',
  health_scare: 'boycott',
  scandal: 'protest',
  great_deal: 'queue',
  weird_sighting: 'curious',
  all_clear: 'relax',
  expose: 'protest',
};

export const ERROR_CODES = [
  // server / room
  'MALFORMED', 'RATE_LIMITED', 'SERVER_FULL', 'ROOM_NOT_FOUND', 'ROOM_FULL', 'MATCH_IN_PROGRESS',
  'COLOR_TAKEN', 'BAD_TOKEN', 'NOT_HOST', 'FILTERED',
  // engine
  'NOT_ALLOWED', 'STALE_PHASE', 'ALREADY_ACTED', 'BAD_TARGET', 'BAD_TEXT', 'EVIDENCE_MISMATCH', 'NO_PROOF',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Shown instead of a headline the AI flagged as inappropriate. */
export const PULLED_TEXT = '[PULLED BY THE EDITOR]';
