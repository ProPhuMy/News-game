import type { Personality } from '../shared/ids.ts';

export interface BotPaperConfig {
  id: string;
  name: string;
  editorName: string;
  personality: Personality;
  tagline: string;
}

export const BOT_NEWSPAPERS: BotPaperConfig[] = [
  {
    id: 'bot-tabloid',
    name: 'The Daily Gasp',
    editorName: 'Barnaby Blitz',
    personality: 'tabloid',
    tagline: 'The Juiciest News First!',
  },
  {
    id: 'bot-gazette',
    name: 'The Morning Ledger',
    editorName: 'Prudence Quill',
    personality: 'gazette',
    tagline: 'Fact, Decency, and Order.',
  },
  {
    id: 'bot-wildcard',
    name: 'Rumor Mill Weekly',
    editorName: 'Ziggy Zoom',
    personality: 'wildcard',
    tagline: 'If You Heard It, We Print It!',
  },
];

export const BOT_PAPERS: Record<Personality, string> = {
  tabloid: 'The Daily Gasp',
  gazette: 'The Morning Ledger',
  wildcard: 'Rumor Mill Weekly',
};
