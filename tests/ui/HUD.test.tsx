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
    expect(screen.getByText('12 readers')).toBeDefined();
    expect(screen.getByText('Trust: 54')).toBeDefined();
  });
});
