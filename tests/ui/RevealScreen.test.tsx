/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { RevealScreen } from '../../src/client/ui/screens/RevealScreen';
import type { FrontPageView } from '../../src/client/ui/components/FrontPageCard';

function makeTownContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'town-canvas-container';
  document.body.appendChild(container);
  return container;
}

function makeFallback(): HTMLElement {
  const fallback = document.createElement('div');
  fallback.className = 'town-fallback-container';
  return fallback;
}

describe('RevealScreen', () => {
  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
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

  const eightBubbles = [
    'Bubble 1',
    'Bubble 2',
    'Bubble 3',
    'Bubble 4',
    'Bubble 5',
    'Bubble 6',
    'Bubble 7',
    'Bubble 8',
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

  it('removes 2D speech bubbles when WebGL context is restored during reveal', async () => {
    const container = makeTownContainer();
    const fallback = makeFallback();
    container.appendChild(fallback);

    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[]}
        recap="Citizens went about their day."
        bubbles={eightBubbles}
      />
    );

    const bubblesBefore = document.querySelectorAll('.citizen-speech-bubble');
    expect(bubblesBefore.length).toBe(6);

    container.removeChild(fallback);
    await waitFor(() => {
      expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(0);
    });
  });

  it('adds 2D speech bubbles when WebGL context is lost during reveal', async () => {
    const container = makeTownContainer();

    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[]}
        recap="Citizens went about their day."
        bubbles={eightBubbles}
      />
    );

    expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(0);

    const fallback = makeFallback();
    container.appendChild(fallback);
    await waitFor(() => {
      expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(6);
    });
  });

  it('respects explicit showBubbles prop regardless of fallback container toggling', async () => {
    const container = makeTownContainer();
    const fallback = makeFallback();
    container.appendChild(fallback);

    const { unmount } = render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[]}
        recap="Citizens went about their day."
        bubbles={eightBubbles}
        showBubbles={false}
      />
    );

    expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(0);
    container.removeChild(fallback);
    expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(0);

    unmount();

    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[]}
        recap="Citizens went about their day."
        bubbles={eightBubbles}
        showBubbles={true}
      />
    );

    expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(6);
    container.appendChild(fallback);
    expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(6);
  });

  it('renders bubble text matching the first 6 entries in order after lost-context toggle', async () => {
    const container = makeTownContainer();

    render(
      <RevealScreen
        frontPages={mockFrontPages}
        exposures={[]}
        recap="Citizens went about their day."
        bubbles={eightBubbles}
      />
    );

    expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(0);

    container.appendChild(makeFallback());
    await waitFor(() => {
      expect(document.querySelectorAll('.citizen-speech-bubble').length).toBe(6);
    });

    const renderedTexts = Array.from(document.querySelectorAll('.bubble-text')).map(
      (el) => el.textContent
    );
    expect(renderedTexts).toEqual(eightBubbles.slice(0, 6));
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

  it('shows an empty state when no paper printed a front page', () => {
    render(<RevealScreen frontPages={[]} exposures={[]} recap="Quiet day." bubbles={[]} showBubbles={false} />);
    expect(screen.getByText('No front pages were printed this round.')).toBeDefined();
  });
});
