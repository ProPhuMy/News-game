import type { GameContent } from '../shared/content-schema.ts';
import type { Claim } from '../shared/ids.ts';
import { EVENT_TEMPLATES } from './events.ts';
import { BUBBLES } from './bubbles.ts';
import { BOT_HEADLINE_TEMPLATES } from './bot-headlines.ts';
import { BOT_PAPERS } from './bot-papers.ts';
import { RULE_CARDS_CONTENT } from './rule-cards.ts';
import { QUIET_DAYS } from './quiet-days.ts';
import { PROMPTS } from './ai-prompts.ts';
import { WORD_LIST } from './word-filter.ts';
import { SOUNDS } from './sounds.ts';

export * from './types.ts';
export * from './events.ts';
export * from './bubbles.ts';
export * from './bot-headlines.ts';
export * from './rule-cards.ts';
export * from './bot-papers.ts';
export * from './word-filter.ts';
export * from './ai-prompts.ts';
export * from './quiet-days.ts';
export * from './sounds.ts';

export const content: GameContent = {
  eventTemplates: [...EVENT_TEMPLATES],
  quietDays: QUIET_DAYS,
  bubbles: Object.fromEntries(
    Object.entries(BUBBLES).map(([k, v]) => [k, [...v]]),
  ) as Record<Claim, string[]>,
  botHeadlines: Object.fromEntries(
    Object.entries(BOT_HEADLINE_TEMPLATES).map(([k, v]) => [k, [...v]]),
  ) as Record<Claim, string[]>,
  botPapers: { ...BOT_PAPERS },
  ruleCards: [...RULE_CARDS_CONTENT],
  prompts: PROMPTS,
  wordList: [...WORD_LIST],
  sounds: { ...SOUNDS },
};
