/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { IntroScreen } from '../../src/client/ui/screens/IntroScreen';
import { RULE_CARDS, RULE_DETAILS } from '../../src/content/rule-cards';
import { content } from '../../src/content/index';
import { ContentSchema } from '../../src/shared/content-schema';

const props = { deadlineMs: Date.now() + 60000, serverTimeOffset: 0 };

describe('rule cards (user-approved captions, 2026-10-26)', () => {
  it('are the three illustrated steps with the approved captions, within schema limits', () => {
    expect(RULE_CARDS).toEqual([
      { title: 'Investigate', body: "Check one place in town to learn the truth and earn evidence. Or dig into a rival's old headline." },
      { title: 'Write', body: 'Print one headline: the honest truth, or a juicy lie. Your choice.' },
      { title: 'Reveal', body: 'The town reacts. Readers flock to good stories, but lies can get exposed and wreck your trust. Score = readers × trust.' },
    ]);
    expect(() => ContentSchema.parse(content)).not.toThrow();
  });

  it('keeps the detailed rules for the How to play dialog', () => {
    expect(RULE_DETAILS.map((d) => d.title)).toEqual(['Run Your Town Newspaper', 'Investigate or Expose', 'The Final Edition']);
  });
});

describe('IntroScreen', () => {
  afterEach(cleanup);

  it('shows each step with its art and caption, and an "I\'m ready" button that sends skipIntro', () => {
    const onSkipIntro = vi.fn();
    const { container } = render(<IntroScreen {...props} onSkipIntro={onSkipIntro} />);
    const steps = container.querySelectorAll('.onboarding-step');
    expect(steps).toHaveLength(3);
    steps.forEach((step, i) => {
      expect(step.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(within(step as HTMLElement).getByText(RULE_CARDS[i]!.title)).toBeDefined();
      expect(within(step as HTMLElement).getByText(RULE_CARDS[i]!.body)).toBeDefined();
    });
    expect(screen.queryByText('Skip Intro')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: "I'm ready" }));
    expect(onSkipIntro).toHaveBeenCalledTimes(1);
  });

  it('phone stepper: Back/Next stay mounted (aria-disabled at the ends) so focus never drops; count announces the step', () => {
    const { container } = render(<IntroScreen {...props} onSkipIntro={vi.fn()} />);
    const deck = container.querySelector('.onboarding-deck')!;
    const back = screen.getByRole('button', { name: 'Back' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(deck.getAttribute('data-step')).toBe('1');
    expect(back.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(back);
    expect(deck.getAttribute('data-step')).toBe('1');
    fireEvent.click(next);
    fireEvent.click(next);
    expect(deck.getAttribute('data-step')).toBe('3');
    expect(screen.getByText('Step 3 of 3')).toBeDefined();
    expect(next.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(next);
    expect(deck.getAttribute('data-step')).toBe('3');
    fireEvent.click(back);
    expect(deck.getAttribute('data-step')).toBe('2');
    expect(screen.getByRole('button', { name: "I'm ready" })).toBeDefined();
    const current = container.querySelectorAll('.onboarding-step[data-current]');
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toContain('Write');
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('after pressing ready, shows the waiting state instead of the button', () => {
    render(<IntroScreen {...props} onSkipIntro={vi.fn()} ready />);
    expect(screen.queryByRole('button', { name: "I'm ready" })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Waiting for the other editors');
  });

  it('moves focus to the waiting line when the pressed ready button unmounts', () => {
    const { rerender } = render(<IntroScreen {...props} onSkipIntro={vi.fn()} />);
    screen.getByRole('button', { name: "I'm ready" }).focus();
    rerender(<IntroScreen {...props} onSkipIntro={vi.fn()} ready />);
    expect(document.activeElement).toBe(screen.getByRole('status'));
  });
});
