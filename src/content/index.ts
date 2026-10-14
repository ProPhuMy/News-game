import type { GameContent } from '../shared/content-schema.ts';
import { EVENT_TEMPLATES } from './events.ts';
import { BUBBLES } from './bubbles.ts';
import { BOT_HEADLINES } from './bot-headlines.ts';
import { BOT_PAPERS } from './bot-papers.ts';
import { RULE_CARDS } from './rule-cards.ts';
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
  eventTemplates: EVENT_TEMPLATES,
  quietDays: QUIET_DAYS,
  bubbles: BUBBLES,
  botHeadlines: BOT_HEADLINES,
  botPapers: BOT_PAPERS,
  ruleCards: RULE_CARDS,
  prompts: PROMPTS,
  wordList: WORD_LIST,
  sounds: SOUNDS,
};
