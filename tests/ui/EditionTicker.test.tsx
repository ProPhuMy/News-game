/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { EditionTicker } from '../../src/client/ui/components/EditionTicker';
import { HUD } from '../../src/client/ui/hud/HUD';
import type { FrontPageView } from '../../src/client/ui/components/FrontPageCard';

const page = (seatId: number, headlineText: string, extra: Partial<FrontPageView> = {}): FrontPageView => ({
  seatId, paperName: `Paper ${seatId}`, color: (['red', 'blue', 'green', 'gold'] as const)[seatId]!, headlineText,
  hasEvidence: false, isExposed: false, ...extra,
});

describe('EditionTicker (interface §5c)', () => {
  afterEach(cleanup);

  it('is a labelled region listing every front page in seat order, as text', () => {
    render(<EditionTicker pages={[page(2, 'Third'), page(0, '<b>First</b>'), page(1, 'Second')]} />);
    const region = screen.getByRole('region', { name: 'Latest edition' });
    const [visible] = within(region).getAllByRole('list');
    const items = within(visible!).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('<b>First</b>'), expect.stringContaining('Second'), expect.stringContaining('Third'),
    ]);
    expect(items[0]!.textContent).toContain('Paper 0');
    expect(region.querySelector('b')).toBeNull();
  });

  it('marks exposed headlines from the data', () => {
    render(<EditionTicker pages={[page(0, 'Lie', { isExposed: true }), page(1, 'Truth')]} />);
    const items = within(screen.getAllByRole('list')[0]!).getAllByRole('listitem');
    expect(items[0]!.textContent).toContain('EXPOSED');
    expect(items[1]!.textContent).not.toContain('EXPOSED');
  });

  it('hides the marquee duplicate from assistive technology', () => {
    const { container } = render(<EditionTicker pages={[page(0, 'One')]} />);
    const tracks = container.querySelectorAll('.ticker-track');
    expect(tracks).toHaveLength(2);
    expect(tracks[1]!.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('shows an empty-edition line instead of a blank bar', () => {
    const { container } = render(<EditionTicker pages={[]} />);
    expect(screen.getByRole('region', { name: 'Latest edition' }).textContent).toContain('No front pages this edition');
    expect(container.querySelectorAll('.ticker-track')).toHaveLength(0);
  });
});

describe('HUD ticker slot', () => {
  afterEach(cleanup);

  it('renders the ticker directly under the top bar when given one', () => {
    const { container } = render(
      <HUD round={3} phase="reveal" deadlineMs={Date.now() + 20000} serverTimeOffset={0} papers={[]} ticker={<EditionTicker pages={[page(0, 'One')]} />} />,
    );
    const overlay = container.querySelector('.hud-overlay')!;
    expect([...overlay.children].map((el) => el.className.split(' ')[0])).toEqual(['hud-top-bar', 'edition-ticker', 'hud-body']);
  });

  it('renders no ticker by default', () => {
    render(<HUD round={2} phase="write" deadlineMs={Date.now() + 20000} serverTimeOffset={0} papers={[]} />);
    expect(screen.queryByRole('region', { name: 'Latest edition' })).toBeNull();
  });
});
