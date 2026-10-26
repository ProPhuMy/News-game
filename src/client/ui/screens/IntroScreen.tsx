import React, { useState } from 'react';
import { Button } from '../components/Button';
import { CountdownTimer } from '../components/CountdownTimer';
import { keepFocus } from '../components/keepFocus.ts';
import { StepArt, type OnboardingStep } from '../components/OnboardingArt';
import type { RuleCard } from '../../../content/rule-cards.ts';
import { RULE_CARDS } from '../../../content/rule-cards.ts';
import { APPROVED_PALETTE, getPalette } from '../../visuals/palette.ts';

export interface IntroScreenProps {
  deadlineMs: number;
  serverTimeOffset: number;
  onSkipIntro: () => void;
  /** This seat already pressed "I'm ready" (private `acted` for the intro phase). */
  ready?: boolean;
  ruleCards?: RuleCard[];
}

// Illustrated three-step intro. Desktop shows all steps; phones (CSS, <=640px) show the current one with Back/Next.
// "I'm ready" sends the existing skipIntro command: the intro ends once every connected human is ready.
export const IntroScreen: React.FC<IntroScreenProps> = ({
  deadlineMs,
  serverTimeOffset,
  onSkipIntro,
  ready = false,
  ruleCards = RULE_CARDS,
}) => {
  const [step, setStep] = useState(1);
  const last = ruleCards.length;
  const palette = getPalette(APPROVED_PALETTE);
  return (
    <div className="screen-container intro-screen" data-testid="intro-screen">
      <ol className="onboarding-deck" data-step={step}>
        {ruleCards.map((card, idx) => (
          <li key={card.title} className="onboarding-step" data-current={idx + 1 === step || undefined}>
            <StepArt step={(idx + 1) as OnboardingStep} palette={palette} className="onboarding-art" />
            <div className="onboarding-caption">
              <h3><span className="card-index" aria-hidden="true">{idx + 1}</span>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="intro-footer">
        <div className="onboarding-nav">
          {/* aria-disabled, not disabled: a disabled button drops keyboard focus at the ends. */}
          <Button variant="secondary" aria-disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>Back</Button>
          <span className="onboarding-count" aria-live="polite">Step {step} of {last}</span>
          <Button variant="secondary" aria-disabled={step === last} onClick={() => setStep(Math.min(last, step + 1))}>Next</Button>
        </div>
        <CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset} />
        {ready
          ? <p className="intro-waiting" role="status" tabIndex={-1} ref={keepFocus}>Waiting for the other editors…</p>
          : <Button variant="retro" onClick={onSkipIntro} className="btn-large">I'm ready</Button>}
      </div>
    </div>
  );
};
