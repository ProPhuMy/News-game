import type { Claim } from '../shared/ids.ts';

export const BUBBLES: Record<Claim, string[]> = {
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
    'Take my pennies already!',
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
};

export const SPEECH_BUBBLES = BUBBLES;
