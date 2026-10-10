import type { BotPersonality } from './bot-headlines.js';

export interface BotPaperConfig {
  readonly id: string;
  readonly name: string; // ≤ 24 chars
  readonly editorName: string; // ≤ 20 chars
  readonly personality: BotPersonality;
  readonly tagline: string;
  readonly preferredColorIndex: number;
}

export const BOT_NEWSPAPERS: readonly BotPaperConfig[] = [
  {
    id: 'bot-tabloid',
    name: 'The Daily Gasp',
    editorName: 'Barnaby Blitz',
    personality: 'tabloid',
    tagline: 'The Juiciest News First!',
    preferredColorIndex: 1, // Megaphone / Orange-Red
  },
  {
    id: 'bot-gazette',
    name: 'The Morning Ledger',
    editorName: 'Prudence Quill',
    personality: 'gazette',
    tagline: 'Fact, Decency, and Order.',
    preferredColorIndex: 0, // Quill / Blue
  },
  {
    id: 'bot-wildcard',
    name: 'Rumor Mill Weekly',
    editorName: 'Ziggy Zoom',
    personality: 'wildcard',
    tagline: 'If You Heard It, We Print It!',
    preferredColorIndex: 2, // Lightning / Yellow
  },
] as const;

export function getBotPaperConfig(personality: BotPersonality): BotPaperConfig | undefined {
  return BOT_NEWSPAPERS.find((p) => p.personality === personality);
}
