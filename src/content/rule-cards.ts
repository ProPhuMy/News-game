export interface RuleCard {
  title: string;
  body: string;
}

// The intro's three illustrated steps (captions approved by the user, 2026-10-26). Art: ui/components/OnboardingArt.
export const RULE_CARDS: RuleCard[] = [
  {
    title: 'Investigate',
    body: "Check one place in town to learn the truth and earn evidence. Or dig into a rival's old headline.",
  },
  {
    title: 'Write',
    body: 'Print one headline: the honest truth, or a juicy lie. Your choice.',
  },
  {
    title: 'Reveal',
    body: 'The town reacts. Readers flock to good stories, but lies can get exposed and wreck your trust. Score = readers × trust.',
  },
];

// The full rules, shown in the "How to play" dialog during play.
export const RULE_DETAILS: RuleCard[] = [
  {
    title: 'Run Your Town Newspaper',
    body: 'Four papers compete for readers in News Town. Each round, investigate town events and publish one headline—either the honest truth or an outrageous lie. Lies win quick readers, but they can blow up in your face later.',
  },
  {
    title: 'Investigate or Expose',
    body: 'Check locations to gather hard evidence, or dig into rival past stories. If you catch a rival lying, publish an EXPOSE to wreck their trust and boost yours! Town gossip also rolls to expose surviving lies each round.',
  },
  {
    title: 'The Final Edition',
    body: 'After 5 rounds, surviving lies face doubled exposure odds. All truths are revealed. Your final score is total accumulated readers multiplied by final trust: Score = Readers × (Trust / 50). You need both to win!',
  },
];

export const RULE_CARDS_CONTENT = RULE_CARDS;
