/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FixturePlayer } from '../../src/client/ui/dev/FixturePlayer';
import type { FixtureStep } from '../../src/client/ui/dev/FixturePlayer';

describe('FixturePlayer Harness', () => {
  const sampleSteps: FixtureStep[] = [
    { round: 1, phase: 'investigate', label: 'Round 1 Investigate' },
    { round: 1, phase: 'write', label: 'Round 1 Write' },
    { round: 1, phase: 'reveal', label: 'Round 1 Reveal' },
  ];

  it('steps through fixture timeline with next/prev buttons', () => {
    render(<FixturePlayer steps={sampleSteps} />);

    expect(screen.getByText('Step 1 of 3: Round 1 Investigate')).toBeDefined();

    const nextBtn = screen.getByText('Next Step');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Step 2 of 3: Round 1 Write')).toBeDefined();
  });
});
