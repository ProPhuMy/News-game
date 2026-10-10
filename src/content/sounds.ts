import type { SOUND_KEYS } from '../shared/content-schema.ts';

export type SoundKey = (typeof SOUND_KEYS)[number];

export const SOUNDS: Readonly<Record<SoundKey, string>> = {
  paperSlap: '/sounds/paper-slap.mp3',
  gasp: '/sounds/gasp.mp3',
  murmur: '/sounds/crowd-murmur.mp3',
  poof: '/sounds/poof.mp3',
} as const;
