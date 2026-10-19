/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { FinalEditionScreen } from '../../src/client/ui/screens/FinalEditionScreen';
import { TUNING } from '../../src/shared/tuning';
import type { FinalScoreRow } from '../../src/client/ui/components/ScoreboardTable';

describe('FinalEditionScreen', () => {
  afterEach(cleanup);
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

  describe('results card', () => {
    const headlines = [
      { id: 'h1', round: 1, paperName: 'The Bugle', text: 'All calm at Town Hall', truth: 'true' as const, exposed: false },
    ];
    const records = [{ paperName: 'The Bugle', color: 'red' as const, liesTold: 0, liesCaught: 0, liesEscaped: 0 }];
    const exposures = [{ paperName: 'The Gazette', reason: 'Never happened.' }];

    it('puts the winner in the header and the truth history in the scrollable body', () => {
      const { container } = render(<FinalEditionScreen scoreboard={mockScores} headlines={headlines} onPlayAgain={vi.fn()} />);
      const card = container.querySelector('section.results-card')!;
      expect(card.getAttribute('aria-labelledby')).toBeTruthy();
      expect(card.querySelector('header')?.textContent).toContain('Winner: The Bugle!');
      const body = card.querySelector('.results-body')!;
      expect(body.getAttribute('tabindex')).toBe('0');
      expect(body.getAttribute('aria-label')).toBeTruthy();
      expect(within(body as HTMLElement).getByRole('heading', { name: /The truth comes out/ })).toBeDefined();
      expect(within(body as HTMLElement).getByTestId('scoreboard-table')).toBeDefined();
    });

    it('collapses scandals and integrity records by default', () => {
      const { container } = render(
        <FinalEditionScreen scoreboard={mockScores} finalExposures={exposures} truthRecords={records} onPlayAgain={vi.fn()} />,
      );
      const details = [...container.querySelectorAll('.results-body details')];
      expect(details.map((d) => d.querySelector('summary')?.textContent)).toEqual([
        expect.stringContaining('Final edition scandals'), expect.stringContaining('Integrity records'),
      ]);
      for (const d of details) expect(d.hasAttribute('open')).toBe(false);
    });

    it('keeps Play Again outside the scroll area', () => {
      const onPlayAgain = vi.fn();
      const { container } = render(<FinalEditionScreen scoreboard={mockScores} onPlayAgain={onPlayAgain} />);
      const button = within(container).getByRole('button', { name: 'Play Again' });
      expect(button.closest('.results-body')).toBeNull();
      expect(button.closest('.results-footer')).not.toBeNull();
      button.click();
      expect(onPlayAgain).toHaveBeenCalledOnce();
    });

    it('shows an empty-state line when there are no headlines', () => {
      const { container } = render(<FinalEditionScreen scoreboard={mockScores} onPlayAgain={vi.fn()} />);
      expect(within(container).getByText('No headlines were printed this match.')).toBeDefined();
    });
  });
});
