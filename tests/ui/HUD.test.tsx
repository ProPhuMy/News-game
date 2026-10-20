/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HUD } from '../../src/client/ui/hud/HUD';
import type { PaperView } from '../../src/client/ui/hud/SidePanel';

describe('HUD', () => {
  const mockPapers: PaperView[] = [
    {
      seatId: 0,
      paperName: 'The Daily Gasp',
      playerName: 'Alice',
      color: 'red',
      readers: 12,
      totalReaders: 40,
      trust: 54,
      score: 13,
      isBot: false,
      isCaretaker: false,
      hasLocked: true,
    },
    {
      seatId: 1,
      paperName: 'Morning Ledger',
      playerName: 'Bob',
      color: 'blue',
      readers: 8,
      totalReaders: 25,
      trust: 60,
      score: 10,
      isBot: true,
      isCaretaker: false,
      hasLocked: false,
    },
  ];

  it('renders top bar phase info and paper scores in side panel', () => {
    render(
      <HUD
        round={2}
        phase="write"
        deadlineMs={Date.now() + 30000}
        serverTimeOffset={0}
        papers={mockPapers}
      />
    );

    expect(screen.getByText('Round 2 of 5')).toBeDefined();
    expect(screen.getByText('Write Headline')).toBeDefined();
    expect(screen.getByText('The Daily Gasp')).toBeDefined();
    const alice = screen.getByText('The Daily Gasp').closest('.paper-card');
    expect(alice?.querySelector('.stat-readers')?.textContent).toBe('Readers now 12');
    expect(alice?.querySelector('.stat-total-readers')?.textContent).toBe('Total readers 40');
    expect(screen.getByText('Trust: 54')).toBeDefined();
  });

  it('shows a get-ready badge during the intro instead of round 0', () => {
    render(<HUD round={0} phase="intro" deadlineMs={Date.now() + 30000} serverTimeOffset={0} papers={mockPapers} />);
    expect(screen.getByText('Get Ready')).toBeDefined();
    expect(screen.queryByText(/Round 0/)).toBeNull();
  });

  it('renders top-level error banner when error prop is provided', () => {
    render(
      <HUD
        round={1}
        phase="intro"
        deadlineMs={Date.now() + 30000}
        serverTimeOffset={0}
        papers={mockPapers}
        error="Only the host can start the match."
      />
    );

    const banner = screen.getByTestId('hud-error');
    expect(banner).toBeDefined();
    expect(screen.getByText('Only the host can start the match.')).toBeDefined();
  });
});
