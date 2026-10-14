/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RevealScreen } from '../../src/client/ui/screens/RevealScreen';
import type { FrontPageView } from '../../src/client/ui/components/FrontPageCard';

describe('RevealScreen', () => {
  afterEach(() => {
    cleanup();
  });
  const mockFrontPages: FrontPageView[] = [
    {
      seatId: 0,
      paperName: 'The Daily Gasp',
      color: 'red',
      headlineText: 'Monsters Spotted in Town Fountain!',
      hasEvidence: false,
      isExposed: true,
      exposureReason: 'Town council verified it was just fountain bubbles.',
    },
    {
      seatId: 1,
      paperName: 'The Morning Ledger',
      color: 'blue',
      headlineText: 'Town Hall Records All Clear',
      hasEvidence: true,
      isExposed: false,
    },
  ];

  it('renders all front pages as text, shows exposure stamp and recap line', () => {
    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[{ paperName: 'The Daily Gasp', reason: 'Town council verified it was just fountain bubbles.' }]}
        recap="9 citizens rushed the square; 3 cancelled their subscriptions."
        bubbles={['What a scandal!', 'I saw it too!']}
        showBubbles={true}
      />
    );

    expect(screen.getByText('The Daily Gasp')).toBeDefined();
    expect(screen.getByText('Monsters Spotted in Town Fountain!')).toBeDefined();
    expect(screen.getByText('THE TRUTH COMES OUT')).toBeDefined();
    expect(screen.getByText('9 citizens rushed the square; 3 cancelled their subscriptions.')).toBeDefined();
    expect(screen.getByText('What a scandal!')).toBeDefined();
  });

  it('suppresses 2D speech bubbles overlay when 3D town is active without fallback container', () => {
    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[]}
        recap="Citizens went about their day."
        bubbles={['Town rumor 1', 'Town rumor 2']}
      />
    );

    expect(screen.queryByLabelText('Citizen reactions')).toBeNull();
    expect(screen.queryByText('Town rumor 1')).toBeNull();
  });

  it('renders 2D speech bubbles overlay when .town-fallback-container is present in the document', () => {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'town-fallback-container';
    document.body.appendChild(fallbackDiv);

    try {
      render(
        <RevealScreen
          frontPages={mockFrontPages}
          exposures={[]}
          recap="Citizens went about their day."
          bubbles={['Fallback rumor 1']}
        />
      );

      expect(screen.getByLabelText('Citizen reactions')).toBeDefined();
      expect(screen.getByText('Fallback rumor 1')).toBeDefined();
    } finally {
      fallbackDiv.remove();
    }
  });

  it('formats recap text cleanly with deriveRecapText, falling back when location is missing', async () => {
    const { deriveRecapText } = await import('../../src/client/ui/mapper');
    const mockPapers: import('../../src/shared/snapshots').PaperPublic[] = [
      {
        seatId: 0,
        displayName: 'Editor',
        paperName: 'Daily Gasp',
        color: 'red',
        personality: null,
        controller: 'human',
        readers: 20,
        totalReaders: 20,
        trust: 50,
        score: 20,
        lockedVisibleAtMs: null,
      },
    ];

    // Missing location -> fallback
    const fallbackRecap = deriveRecapText(
      {
        round: 1,
        exposures: [],
        citizens: [],
        recap: {
          headlineId: null,
          location: null,
          behavior: 'routine',
          reactors: 0,
          gainSeatId: null,
          gained: 0,
        },
      },
      mockPapers
    );
    expect(fallbackRecap).toBe('Citizens went about their day.');

    // With location and gaining paper
    const normalRecap = deriveRecapText(
      {
        round: 1,
        exposures: [],
        citizens: [],
        recap: {
          headlineId: null,
          location: 'bakery',
          behavior: 'queue',
          reactors: 8,
          gainSeatId: 0,
          gained: 3,
        },
      },
      mockPapers
    );
    expect(normalRecap).toBe('8 citizens lined up outside the Bakery; 3 citizens switched to Daily Gasp.');
  });
});
