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

  it('phone stepper: Next and Back move one step; Next hides on the last step; I\'m ready is always there', () => {
    const { container } = render(<IntroScreen {...props} onSkipIntro={vi.fn()} />);
    const deck = container.querySelector('.onboarding-deck')!;
    expect(deck.getAttribute('data-step')).toBe('1');
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(deck.getAttribute('data-step')).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(deck.getAttribute('data-step')).toBe('3');
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(deck.getAttribute('data-step')).toBe('2');
    expect(screen.getByRole('button', { name: "I'm ready" })).toBeDefined();
    const current = container.querySelectorAll('.onboarding-step[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toContain('Write');
  });

  it('after pressing ready, shows the waiting state instead of the button', () => {
    render(<IntroScreen {...props} onSkipIntro={vi.fn()} ready />);
    expect(screen.queryByRole('button', { name: "I'm ready" })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Waiting for the other editors');
  });
});
