/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InvestigateScreen } from '../../src/client/ui/screens/InvestigateScreen';
import { WriteScreen } from '../../src/client/ui/screens/WriteScreen';
import { RevealScreen } from '../../src/client/ui/screens/RevealScreen';

const investigate = (round: number, rivals = 0) => (
  <InvestigateScreen tipText="A truck at the bakery." round={round} hasLocked={false}
    rivalHeadlines={Array.from({ length: rivals }, (_, i) => ({ id: `h${i}`, round: 1, paperName: 'Gasp', text: 'Big news' }))}
    onInvestigateLocation={vi.fn()} onInvestigateRival={vi.fn()} onSkip={vi.fn()} />
);
const write = (round: number) => (
  <WriteScreen round={round} hasLocked={false} evidenceCards={[]} proofCards={[]} onLockHeadline={vi.fn()} onSkipWrite={vi.fn()} />
);
const yourMove = () => document.querySelectorAll('.your-move');

describe('"Your move" lines (onboarding proposal)', () => {
  afterEach(cleanup);

  it('Investigate round 1 asks for one place (no rival option yet) and adds a first-round hint', () => {
    render(investigate(1));
    expect(yourMove()).toHaveLength(1);
    expect(yourMove()[0]!.textContent).toBe('Your move: pick one place to check.');
    expect(document.querySelectorAll('.round-one-hint')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Check a place (sure answer + evidence)' })).toBeDefined();
  });

  it('Investigate later rounds offer both choices, with shorter headings and no hint', () => {
    render(investigate(2, 1));
    expect(yourMove()[0]!.textContent).toBe("Your move: check one place — or a rival's old headline.");
    expect(screen.getByRole('heading', { name: "Dig into a rival's old headline (may find proof of a lie)" })).toBeDefined();
    expect(document.querySelector('.round-one-hint')).toBeNull();
    expect(screen.getByRole('button', { name: 'Skip Investigation' })).toBeDefined();
  });

  it('Write says what to do, with a hint only in round 1', () => {
    render(write(1));
    expect(yourMove()[0]!.textContent).toBe('Your move: pick a place and a claim, write a headline, lock it in.');
    expect(document.querySelectorAll('.round-one-hint')).toHaveLength(1);
    cleanup();
    render(write(3));
    expect(document.querySelector('.round-one-hint')).toBeNull();
    expect(screen.getByRole('button', { name: 'Skip Writing' })).toBeDefined();
  });

  it('Reveal tells players there is nothing to do', () => {
    render(<RevealScreen frontPages={[]} exposures={[]} recap="" />);
    expect(yourMove()[0]!.textContent).toBe('Watch the town react. Nothing to do.');
  });
});
