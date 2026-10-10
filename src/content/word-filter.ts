export const BLOCKED_WORDS: readonly string[] = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'pussy',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'kike',
  'spic',
  'chink',
  'whore',
  'slut',
  'nazi',
  'hitler',
  'kill yourself',
  'kys',
  'pedophile',
  'rape',
] as const;

export const PROFANITY_WORD_LIST = BLOCKED_WORDS;

export function containsProfanity(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');

  for (const word of BLOCKED_WORDS) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

export const checkProfanity = containsProfanity;
