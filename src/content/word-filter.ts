/**
 * Prohibited terms and phrases for the lock-time profanity filter.
 * Normalization, punctuation preservation, and matching logic are implemented in Codex's AI module (src/ai/).
 * Every entry must be lowercase and conform to /^[a-z][a-z' -]*$/ per ContentSchema.
 *
 * Policy note: Certain ambiguous entries (such as 'dick' or 'chink') are intentionally
 * retained to uphold the family-friendly standard and prevent vulgar or hateful abuse,
 * accepting the intentional tradeoff that benign headlines containing them will be rejected.
 */
export const WORD_LIST: string[] = [
  'fuck',
  'fucking',
  'fucked',
  'fucker',
  'fuckers',
  'motherfucker',
  'motherfuckers',
  'motherfucking',
  'shit',
  'shits',
  'shitty',
  'bullshit',
  'shithead',
  'bitch',
  'bitches',
  'bitching',
  'asshole',
  'assholes',
  'bastard',
  'bastards',
  'cunt',
  'cunts',
  'dick',
  'dicks',
  'pussy',
  'pussies',
  'nigger',
  'niggers',
  'nigga',
  'niggas',
  'faggot',
  'faggots',
  'retard',
  'retards',
  'retarded',
  'kike',
  'kikes',
  'spic',
  'spics',
  'chink',
  'chinks',
  'whore',
  'whores',
  'slut',
  'sluts',
  'nazi',
  'nazis',
  'hitler',
  'kill yourself',
  'kys',
  'pedophile',
  'pedophiles',
  'rape',
  'rapist',
];

export const BLOCKED_WORDS = WORD_LIST;
export const PROFANITY_WORD_LIST = WORD_LIST;
