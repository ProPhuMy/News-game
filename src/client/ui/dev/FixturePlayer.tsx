import React, { useState } from 'react';
import type { Phase } from '../../../shared/ids';
import type { Fixture, FixtureFrame } from '../../../shared/fixture';
import { Button } from '../components/Button';
import { HUD } from '../hud/HUD';
import { IntroScreen } from '../screens/IntroScreen';
import { InvestigateScreen } from '../screens/InvestigateScreen';
import { WriteScreen } from '../screens/WriteScreen';
import { RevealScreen } from '../screens/RevealScreen';
import { FinalEditionScreen } from '../screens/FinalEditionScreen';
import { SoundProvider } from '../audio/SoundContext';

export interface FixtureStep {
  round: number;
  phase: Phase;
  label: string;
}

export interface FixturePlayerProps {
  steps: FixtureStep[];
  onStepChange?: (step: FixtureStep) => void;
}

export const FixturePlayer: React.FC<FixturePlayerProps> = ({ steps, onStepChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const fallbackStep: FixtureStep = { round: 1, phase: 'intro', label: 'Empty' };
  const currentStep = steps[currentIndex] ?? fallbackStep;

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextStep = steps[nextIdx];
      if (nextStep) {
        onStepChange?.(nextStep);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevStep = steps[prevIdx];
      if (prevStep) {
        onStepChange?.(prevStep);
      }
    }
  };

  return (
    <div
      className="fixture-player-toolbar"
      role="toolbar"
      aria-label="Fixture Player Controls"
      data-testid="fixture-player-toolbar"
    >
      <div className="step-label">
        Step {currentIndex + 1} of {steps.length}: {currentStep.label}
      </div>
      <div className="step-actions">
        <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0}>
          Previous Step
        </Button>
        <Button variant="primary" onClick={handleNext} disabled={currentIndex === steps.length - 1}>
          Next Step
        </Button>
      </div>
    </div>
  );
};

import {
  paperPublicToView,
  headlineToFrontPageView,
  finalToScoreRows,
  deriveFrontPages,
  deriveProofCards,
  deriveEvidenceCards,
  deriveExposures,
  deriveRecapText,
  deriveTruthRecords,
  deriveFinalExposures,
  deriveFinalHeadlines,
} from '../mapper.ts';

export {
  paperPublicToView,
  headlineToFrontPageView,
  finalToScoreRows,
  deriveFrontPages,
  deriveProofCards,
  deriveEvidenceCards,
  deriveExposures,
  deriveRecapText,
  deriveTruthRecords,
  deriveFinalExposures,
  deriveFinalHeadlines,
};

export interface FixturePlaybackViewProps {
  fixture: Fixture;
  initialFrameIndex?: number;
  onFrameChange?: (frame: FixtureFrame, index: number) => void;
}

export const FixturePlaybackView: React.FC<FixturePlaybackViewProps> = ({
  fixture,
  initialFrameIndex = 0,
  onFrameChange,
}) => {
  const [frameIndex, setFrameIndex] = useState(
    Math.min(Math.max(0, initialFrameIndex), fixture.frames.length - 1)
  );

  const fallbackFrame: FixtureFrame = fixture.frames[0]!;
  const currentFrame = fixture.frames[frameIndex] ?? fallbackFrame;

  const handleNext = () => {
    if (frameIndex < fixture.frames.length - 1) {
      const nextIdx = frameIndex + 1;
      setFrameIndex(nextIdx);
      const nextFrame = fixture.frames[nextIdx];
      if (nextFrame) onFrameChange?.(nextFrame, nextIdx);
    }
  };

  const handlePrev = () => {
    if (frameIndex > 0) {
      const prevIdx = frameIndex - 1;
      setFrameIndex(prevIdx);
      const prevFrame = fixture.frames[prevIdx];
      if (prevFrame) onFrameChange?.(prevFrame, prevIdx);
    }
  };

  const pub = currentFrame.public;
  const priv = currentFrame.private;
  const papersView = pub.papers.map((p) => paperPublicToView(p, Date.now()));
  const frontPages = deriveFrontPages(pub);
  const exposuresEvents = deriveExposures(pub.exposures, pub.papers, pub.round);
  const recapText = deriveRecapText(pub.reactionPlan, pub.papers);
  const evidenceCards = deriveEvidenceCards(priv.evidence, pub.round);
  const proofCards = deriveProofCards(priv.proofs, pub);

  const bubbles = pub.reactionPlan?.citizens
    .map((c) => c.bubble)
    .filter((b): b is string => typeof b === 'string' && b.length > 0) ?? [];

  return (
    <SoundProvider>
      <div className="fixture-playback-container" data-testid="fixture-playback-container">
        <div
          className="fixture-player-toolbar"
          role="toolbar"
          aria-label="Fixture Timeline Controls"
          data-testid="fixture-player-toolbar"
        >
          <div className="fixture-info">
            <strong>{fixture.name}</strong> — Frame {frameIndex + 1} of {fixture.frames.length} (R{pub.round} {pub.phase})
          </div>
          <div className="fixture-actions">
            <Button variant="secondary" onClick={handlePrev} disabled={frameIndex === 0}>
              Prev Frame
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={frameIndex === fixture.frames.length - 1}>
              Next Frame
            </Button>
          </div>
        </div>

        <HUD
          round={pub.round}
          phase={pub.phase}
          deadlineMs={pub.deadlineMs}
          serverTimeOffset={0}
          papers={papersView}
        >
          {pub.phase === 'intro' && (
            <IntroScreen
              deadlineMs={pub.deadlineMs}
              serverTimeOffset={0}
              onSkipIntro={handleNext}
            />
          )}

          {pub.phase === 'investigate' && (
            <InvestigateScreen
              tipText={priv.tip?.text ?? 'No active tip for this round.'}
              round={pub.round}
              hasLocked={priv.acted}
              rivalHeadlines={[]}
              onInvestigateLocation={handleNext}
              onInvestigateRival={handleNext}
              onSkip={handleNext}
            />
          )}

          {pub.phase === 'write' && (
            <WriteScreen
              hasLocked={priv.acted}
              evidenceCards={evidenceCards}
              proofCards={proofCards}
              onLockHeadline={handleNext}
              onSkipWrite={handleNext}
            />
          )}

          {pub.phase === 'reveal' && (
            <RevealScreen
              frontPages={frontPages}
              exposures={exposuresEvents}
              recap={recapText}
              bubbles={bubbles}
            />
          )}

          {(pub.phase === 'final' || pub.phase === 'ended') && (
            <FinalEditionScreen
              scoreboard={finalToScoreRows(pub.final, pub.papers)}
              truthRecords={deriveTruthRecords(pub.final?.records, pub.papers)}
              finalExposures={deriveFinalExposures(pub.final, pub.papers)}
              headlines={deriveFinalHeadlines(pub.headlines, pub.papers)}
              onPlayAgain={() => setFrameIndex(0)}
            />
          )}
        </HUD>
      </div>
    </SoundProvider>
  );
};
