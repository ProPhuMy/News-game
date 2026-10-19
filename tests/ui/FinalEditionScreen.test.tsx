/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FinalEditionScreen } from '../../src/client/ui/screens/FinalEditionScreen';
import { TUNING } from '../../src/shared/tuning';
import type { FinalScoreRow } from '../../src/client/ui/components/ScoreboardTable';

describe('FinalEditionScreen', () => {
  const mockScores: FinalScoreRow[] = [
    {
      seatId: 0,
      paperName: 'The Bugle',
      playerName: 'Alice',
      color: 'red',
      totalReaders: 45,
      finalTrust: 80,
      finalScore: 72,
      truthRecord: '1 lie told, 0 caught, 1 got away',
      isWinner: true,
    },
    {
      seatId: 1,
      paperName: 'The Gazette',
      playerName: 'Bob',
      color: 'blue',
      totalReaders: 50,
      finalTrust: 40,
      finalScore: 40,
      truthRecord: '3 lies told, 2 caught, 1 got away',
      isWinner: false,
    },
  ];

  it('renders final scoreboard with calculation formula and winner announcement', () => {
    render(
      <FinalEditionScreen
        scoreboard={mockScores}
        onPlayAgain={vi.fn()}
      />
    );

    expect(screen.getByText('Final Edition Scoreboard')).toBeDefined();
    expect(screen.getByText('The Bugle')).toBeDefined();
    expect(screen.getByText('Score: 72')).toBeDefined();
    expect(screen.getByText('Winner: The Bugle!')).toBeDefined();
  });

  it('renders final exposures, truth records, and headline archive', () => {
    const mockExposures = [
      { paperName: 'The Gazette', reason: 'Secret meeting at the Bakery never took place.' },
    ];
    const mockRecords = [
      { paperName: 'The Bugle', color: 'red' as const, liesTold: 1, liesCaught: 0, liesEscaped: 1 },
      { paperName: 'The Gazette', color: 'blue' as const, liesTold: 3, liesCaught: 2, liesEscaped: 1 },
    ];
    const mockHeadlines = [
      { id: 'h1', round: 1, paperName: 'The Bugle', text: 'All calm at Town Hall', truth: 'true' as const, exposed: false },
      { id: 'h2', round: 2, paperName: 'The Gazette', text: 'Scandal at Clinic', truth: 'lie' as const, exposed: true },
    ];

    render(
      <FinalEditionScreen
        scoreboard={mockScores}
        finalExposures={mockExposures}
        truthRecords={mockRecords}
        headlines={mockHeadlines}
        onPlayAgain={vi.fn()}
      />
    );

    expect(screen.getByTestId('final-exposures')).toBeDefined();
    expect(screen.getByText(/Secret meeting at the Bakery never took place/)).toBeDefined();

    expect(screen.getByTestId('truth-records')).toBeDefined();
    expect(screen.getByText('Lies Told: 1')).toBeDefined();
    expect(screen.getByText('Caught & Exposed: 2')).toBeDefined();

    expect(screen.getByTestId('headline-truth-archive')).toBeDefined();
    expect(screen.getByText('"All calm at Town Hall"')).toBeDefined();
    expect(screen.getByText('✓ TRUE')).toBeDefined();
    expect(screen.getByText('✗ EXPOSED LIE')).toBeDefined();
  });

  it('labels cumulative readers and derives the score formula from tuning', () => {
    const view = within(render(<FinalEditionScreen scoreboard={mockScores} onPlayAgain={() => {}} />).container);
    expect(view.getByRole('columnheader', { name: 'Total readers' })).toBeDefined();
    expect(view.getByText(`Score = Total readers × Trust ÷ ${TUNING.scoreTrustDivisor}, rounded`)).toBeDefined();
  });
});
