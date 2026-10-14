/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Fixture } from '../../src/shared/fixture';
import { FixturePlaybackView } from '../../src/client/ui/dev/FixturePlayer';
import soloHonestJson from '../../src/sim/fixtures/solo-honest.json';
import exposuresJson from '../../src/sim/fixtures/exposures.json';

const soloHonestFixture = soloHonestJson as unknown as Fixture;
const exposuresFixture = exposuresJson as unknown as Fixture;

describe('Fixture Playback Integration', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all phases of solo-honest fixture smoothly without throwing', () => {
    render(<FixturePlaybackView fixture={soloHonestFixture} />);

    // Initially in frame 0 (intro)
    expect(screen.getByTestId('fixture-player-toolbar')).toBeDefined();
    expect(screen.getByText(/Frame 1 of/)).toBeDefined();

    // Step forward through frames
    const nextBtn = screen.getByText('Next Frame');
    fireEvent.click(nextBtn);

    // Frame should update
    expect(screen.getByText(/Frame 2 of/)).toBeDefined();
  });

  it('renders exposures and truth details in exposures fixture reveal frame', () => {
    // Find a reveal frame with exposures
    const revealFrameIndex = exposuresFixture.frames.findIndex(
      (f) => f.public.phase === 'reveal' && f.public.exposures.length > 0
    );
    expect(revealFrameIndex).toBeGreaterThan(-1);

    render(
      <FixturePlaybackView
        fixture={exposuresFixture}
        initialFrameIndex={revealFrameIndex}
      />
    );

    // Check that RevealScreen and exposure banner are rendered
    expect(screen.getByTestId('reveal-screen')).toBeDefined();
    expect(screen.getByTestId('exposure-banner')).toBeDefined();
    expect(screen.getByText('🚨 SCANDAL REPORT')).toBeDefined();
    expect(screen.getByText(/The mixed Post:/)).toBeDefined();
  });

  it('renders final edition scoreboard on finale frame', () => {
    const finalFrameIndex = soloHonestFixture.frames.findIndex(
      (f) => f.public.phase === 'final' && f.public.final !== null
    );
    expect(finalFrameIndex).toBeGreaterThan(-1);

    render(
      <FixturePlaybackView
        fixture={soloHonestFixture}
        initialFrameIndex={finalFrameIndex}
      />
    );

    expect(screen.getByTestId('final-edition-screen')).toBeDefined();
    expect(screen.getByTestId('scoreboard-table')).toBeDefined();
    expect(screen.getByText(/Winner:/)).toBeDefined();
  });
});
