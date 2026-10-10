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
export const WORD_LIST = [...BLOCKED_WORDS];

const COMPILED_PATTERN = new RegExp(
  `\\b(${BLOCKED_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

export function containsProfanity(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');

  return COMPILED_PATTERN.test(normalized);
}

export const checkProfanity = containsProfanity;
