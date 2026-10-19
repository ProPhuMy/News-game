/**
 * Prohibited terms and phrases for the lock-time profanity filter.
 * Matching lives in createWordFilter (src/ai/text.ts). The same list governs headlines and,
 * from D2, display and paper names; see docs/visual-overhaul/name-filter-policy.md.
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

/** Names the policy must accept or reject; server tests reuse these (see the policy note). */
export const NAME_FILTER_EXAMPLES: { accepted: readonly string[]; rejected: readonly string[] } = {
  accepted: ['Scunthorpe Herald', 'Shitake Times', 'Grapevine Gazette', 'Dickens Daily', 'Kill Your Darlings', 'Ana Nazario'],
  rejected: ['Daily Shit', 'SHIT!', 'ｓｈｉｔ news', 'kill yourself', 'KYS Post', 'Dick'],
};
