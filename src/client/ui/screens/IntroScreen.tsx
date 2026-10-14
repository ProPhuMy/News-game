import React from 'react';
import { Button } from '../components/Button';
import { CountdownTimer } from '../components/CountdownTimer';

export interface IntroScreenProps {
  deadlineMs: number;
  serverTimeOffset: number;
  onSkipIntro: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  deadlineMs,
  serverTimeOffset,
  onSkipIntro,
}) => {
  return (
    <div className="screen-container intro-screen" data-testid="intro-screen">
      <div className="intro-card-deck">
        <div className="rule-card">
          <div className="card-index">I</div>
          <h3>Rule 1: Print Truth or Lies</h3>
          <p>
            Every round, report town events or spin wild rumors. Honest news keeps your trust;
            juicy lies gain immediate attention.
          </p>
        </div>

        <div className="rule-card">
          <div className="card-index">II</div>
          <h3>Rule 2: Win Citizens, Risk Trust</h3>
          <p>
            Citizens switch papers based on appeal and trust. But beware: unexposed lies can
            leak, and rivals can find proof to expose you!
          </p>
        </div>

        <div className="rule-card">
          <div className="card-index">III</div>
          <h3>Rule 3: Final Score = Readers × Trust</h3>
          <p>
            In the Final Edition, all hidden truths are revealed. Only papers with both strong
            readership and high trust will win the town.
          </p>
        </div>
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
