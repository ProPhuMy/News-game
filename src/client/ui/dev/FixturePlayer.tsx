import React, { useState } from 'react';
import type { Phase } from '../../../shared/ids';
import { Button } from '../components/Button';

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
    <div className="fixture-player-toolbar" role="toolbar" aria-label="Fixture Player Controls">
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
