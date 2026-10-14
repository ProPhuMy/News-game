import type { Claim } from '../shared/ids.ts';

export const BOT_HEADLINES: Record<Claim, string[]> = {
  danger: [
    'PANIC: Danger reported near the {location}!',
    'Avoid the {location} — major peril strikes!',
    'Safety hazard confirmed at the {location}!',
  ],
  health_scare: [
    'Is the {location} making residents sick?!',
    'Health advisory issued around the {location}!',
    'Sanitation scare reported at the {location}!',
  ],
  scandal: [
    'SCANDAL: Secret dealings uncovered at the {location}!',
    'Official inquiry targets events at the {location}!',
    'Whistleblower reveals truth about the {location}!',
  ],
  great_deal: [
    'Incredible bargains draw crowds to the {location}!',
    'Huge savings announced at the {location} today!',
    'Rush to the {location} for unprecedented discounts!',
  ],
  weird_sighting: [
    'Mysterious anomaly spotted hovering over the {location}!',
    'Unexplained sighting near the {location} shocks town!',
    'Bizarre events reported at the {location} at dusk!',
  ],
  all_clear: [
    'All calm and orderly across the {location} today.',
    'Routine operations proceed at the {location} in peace.',
    'No issues reported at the {location} — business as usual.',
  ],
  expose: [
    '{paper} caught printing outrageous lies!',
    'The truth comes out: {paper} published fabrications!',
    'Rival paper {paper} exposed for false reporting!',
  ],
};

export const BOT_HEADLINE_TEMPLATES = BOT_HEADLINES;
