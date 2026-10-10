import type { Claim } from '../shared/ids.ts';

export const SPEECH_BUBBLES: Record<Claim | 'mob' | 'switch' | 'general', readonly string[]> = {
  danger: [
    'Run for the hills!',
    'Is anyone else panicking, or just me?',
    'I knew I should have stayed in bed today!',
    'Grab your hats and evacuate!',
    'I am not sticking around to find out!',
  ],
  health_scare: [
    'I am definitely not eating that.',
    'My stomach hurts just hearing about it.',
    'Boycott! Keep your hands off!',
    'Where is the health inspector?!',
    'I will stick to boiled tap water, thanks.',
  ],
  scandal: [
    'I always knew they were up to no good!',
    'Shameful! Absolutely shameful!',
    'Wait until the town council hears this!',
    'Resign! Resign immediately!',
    'Can nobody in this town be trusted?!',
  ],
  great_deal: [
    'One per customer? Step aside!',
    'Shut up and take my pennies!',
    'First in line, baby!',
    'A deal like this only comes once a century!',
    'My wallet is ready!',
  ],
  weird_sighting: [
    'Did you see that or am I seeing things?',
    'I cannot believe my own eyes!',
    'Someone grab a camera right now!',
    'What in the world is happening out there?!',
    'Science cannot explain this!',
  ],
  all_clear: [
    'Ah, peaceful and quiet as usual.',
    'Nothing to worry about here folks.',
    'Another lovely day in News Town.',
    'False alarm! Back to my morning tea.',
    'Boring is good. Boring is safe.',
  ],
  expose: [
    'LIARS! We read your rag and you lied!',
    'Fraudulent ink! Cancel my subscription!',
    'How dare you print those fabrications!',
    'The truth comes out at last!',
    'I want my subscription money back!',
  ],
  mob: [
    'Down with dishonest newspapers!',
    'Stop the presses, you frauds!',
    'We want the truth, not tall tales!',
    'Shame on your phony front page!',
  ],
  switch: [
    'I am reading a real newspaper now!',
    'Poof! Time for better journalism.',
    'Switching papers! That old one is garbage.',
    'My neighbor was right about this paper.',
  ],
  general: [
    'Have you seen today’s front page?',
    'What will they print next?',
    'The ink is still wet on this one.',
    'News Town never sleeps!',
  ],
} as const;

export const BUBBLES: Record<Claim, readonly string[]> = {
  danger: SPEECH_BUBBLES.danger,
  health_scare: SPEECH_BUBBLES.health_scare,
  scandal: SPEECH_BUBBLES.scandal,
  great_deal: SPEECH_BUBBLES.great_deal,
  weird_sighting: SPEECH_BUBBLES.weird_sighting,
  all_clear: SPEECH_BUBBLES.all_clear,
  expose: SPEECH_BUBBLES.expose,
};
