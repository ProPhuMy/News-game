import { describe, expect, it } from 'vitest';
import { BEHAVIORS } from '../../src/shared/ids.ts';
import { EMOTE_FOR_BEHAVIOR, MAX_VISIBLE_EMOTES } from '../../src/client/visuals/emotes.ts';

describe('emote mapping (interface §5c; overhaul design §6)', () => {
  it('maps every behavior: ! danger, ? sightings, anger for protests, $ for offers, nothing otherwise', () => {
    expect(Object.keys(EMOTE_FOR_BEHAVIOR).sort()).toEqual([...BEHAVIORS].sort());
    expect(EMOTE_FOR_BEHAVIOR).toEqual({
      routine: null, flee: '!', boycott: null, protest: 'anger', queue: '$', curious: '?', relax: null, angry_mob: 'anger',
    });
  });

  it('caps visible emotes at eight, separate from the six speech bubbles', () => {
    expect(MAX_VISIBLE_EMOTES).toBe(8);
  });
});
