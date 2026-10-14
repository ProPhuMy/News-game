/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinalEditionScreen } from '../../src/client/ui/screens/FinalEditionScreen';
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
});
