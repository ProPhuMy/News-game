import React, { useState } from 'react';
import type { Phase } from '../../../shared/ids';
import type { Fixture, FixtureFrame } from '../../../shared/fixture';
import type { PaperPublic, HeadlinePublic, Exposure, FinalResult } from '../../../shared/snapshots';
import { Button } from '../components/Button';
import { HUD } from '../hud/HUD';
import type { PaperView } from '../hud/SidePanel';
import type { FrontPageView } from '../components/FrontPageCard';
import type { FinalScoreRow } from '../components/ScoreboardTable';
import type { ExposureEvent } from '../components/ExposureBanner';
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

export function paperPublicToView(p: PaperPublic): PaperView {
  return {
    seatId: p.seatId,
    paperName: p.paperName,
    playerName: p.displayName,
    color: p.color,
    readers: p.readers,
    trust: p.trust,
    score: p.score,
    isBot: p.controller === 'bot',
    isCaretaker: p.controller === 'caretaker',
    hasLocked: p.lockedVisibleAtMs !== null,
  };
}

export function headlineToFrontPageView(
  h: HeadlinePublic,
  papers: PaperPublic[],
  exposures: Exposure[]
): FrontPageView {
  const paper = papers.find((p) => p.seatId === h.seatId);
  const exposure = exposures.find((e) => e.headlineId === h.id);
  return {
    id: h.id,
    seatId: h.seatId,
    paperName: paper?.paperName ?? `Paper ${h.seatId}`,
    color: paper?.color ?? 'grey',
    headlineText: h.text,
    hasEvidence: h.evidence,
    isExposed: h.exposed,
    exposureReason: exposure?.explanation,
  };
}

export function finalToScoreRows(
  final: FinalResult | null,
  papers: PaperPublic[]
): FinalScoreRow[] {
  if (!final) return [];
  return papers.map((p) => {
    const record = final.records.find((r) => r.seatId === p.seatId);
    const truthRecord = record
      ? `${record.liesTold} lies told, ${record.liesCaught} caught, ${record.liesEscaped} got away`
      : 'No record';
    return {
      seatId: p.seatId,
      paperName: p.paperName,
      playerName: p.displayName,
      color: p.color,
      totalReaders: p.totalReaders,
      finalTrust: p.trust,
      finalScore: p.score,
      truthRecord,
      isWinner: final.winners.includes(p.seatId),
    };
  });
}

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
  const papersView = pub.papers.map(paperPublicToView);

  // In reveal phase, display current round headlines and any headlines exposed this round
  const activeHeadlines = pub.headlines.filter(
    (h) => h.round === pub.round || pub.exposures.some((e) => e.headlineId === h.id)
  );
  const frontPages: FrontPageView[] = (activeHeadlines.length > 0 ? activeHeadlines : pub.headlines).map((h) =>
    headlineToFrontPageView(h, pub.papers, pub.exposures)
  );

  const exposuresEvents: ExposureEvent[] = pub.exposures.map((e) => {
    const paper = pub.papers.find((p) => p.seatId === e.seatId);
    return {
      paperName: paper?.paperName ?? `Paper ${e.seatId}`,
      reason: e.explanation,
    };
  });

  const recapText = pub.reactionPlan?.recap
    ? `${pub.reactionPlan.recap.reactors} citizens reacted at the ${pub.reactionPlan.recap.location ?? 'town'}; ${pub.reactionPlan.recap.gained} citizens changed papers.`
    : 'Citizens are reacting to the latest publications.';

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
              evidenceCards={priv.evidence.map((e, idx) => ({
                id: `ev-${idx}`,
                round: e.round,
                location: e.location,
                claimType: e.claim,
                description: e.text,
              }))}
              proofCards={priv.proofs.map((p) => ({
                id: `proof-${p.headlineId}`,
                targetPaperName: `Target ${p.headlineId}`,
                headlineText: p.headlineId,
                location: 'town_hall',
                claimType: 'expose',
              }))}
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
              onPlayAgain={() => setFrameIndex(0)}
            />
          )}
        </HUD>
      </div>
    </SoundProvider>
  );
};
