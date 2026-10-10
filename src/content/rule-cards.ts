export interface RuleCard {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tip: string;
}

export const RULE_CARDS: readonly RuleCard[] = [
  {
    id: 'rule-card-1',
    title: 'Run the Town Paper',
    body: 'Four newspapers compete for readers in News Town. Each round, investigate town events and publish one headline—either the honest truth or an outrageous lie.',
    tip: 'Lies attract quick readers, but they can blow up in your face later.',
  },
  {
    id: 'rule-card-2',
    title: 'Investigate or Expose',
    body: 'Check locations to gather hard evidence, or dig into rival past stories. If you catch a rival lying, publish an EXPOSE to wreck their trust and boost yours!',
    tip: 'Town gossip also rolls to expose surviving lies each round.',
  },
  {
    id: 'rule-card-3',
    title: 'The Final Edition',
    body: 'After 5 rounds, all hidden truths are revealed. Surviving lies face doubled exposure odds. Your final score is total accumulated readers multiplied by final trust.',
    tip: 'Score = Readers × (Trust / 50). You need both circulation and credibility to win!',
  },
] as const;

export const RULE_CARDS_CONTENT = RULE_CARDS.map(({ title, body }) => ({ title, body }));
