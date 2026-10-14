import React from 'react';
import { Button } from '../components/Button';
import { CountdownTimer } from '../components/CountdownTimer';
import type { RuleCard } from '../../../content/rule-cards.ts';
import { RULE_CARDS } from '../../../content/rule-cards.ts';

export interface IntroScreenProps {
  deadlineMs: number;
  serverTimeOffset: number;
  onSkipIntro: () => void;
  ruleCards?: RuleCard[];
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export const IntroScreen: React.FC<IntroScreenProps> = ({
  deadlineMs,
  serverTimeOffset,
  onSkipIntro,
  ruleCards = RULE_CARDS,
}) => {
  return (
    <div className="screen-container intro-screen" data-testid="intro-screen">
      <div className="intro-card-deck">
        {ruleCards.map((card, idx) => (
          <div key={card.title} className="rule-card">
            <div className="card-index">{ROMAN_NUMERALS[idx] ?? `${idx + 1}`}</div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </div>
        ))}
      </div>

      <div className="intro-footer">
        <CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset} />
        <Button variant="retro" onClick={onSkipIntro} className="btn-large">
          Skip Intro
        </Button>
      </div>
    </div>
  );
};
