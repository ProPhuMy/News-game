// Emote glyphs over reacting citizens (owner: Claude; Codex draws them). Interface §5c, overhaul design §6:
// ! for danger, ? for unusual sightings, an anger mark for protests, $ for offers. The glyph is the non-color cue.
import type { Behavior } from '../../shared/ids.ts';

export type Emote = '!' | '?' | 'anger' | '$';

export const EMOTE_FOR_BEHAVIOR: Readonly<Record<Behavior, Emote | null>> = {
  routine: null,
  flee: '!',
  boycott: null,
  protest: 'anger',
  queue: '$',
  curious: '?',
  relax: null,
  angry_mob: 'anger',
};

/** Crowd cap for emotes; speech bubbles keep their own limit of 6. Selection rules are Codex's (interface §5c). */
export const MAX_VISIBLE_EMOTES = 8;
