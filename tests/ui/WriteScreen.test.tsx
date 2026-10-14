/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WriteScreen } from '../../src/client/ui/screens/WriteScreen';

describe('WriteScreen', () => {
  afterEach(() => {
    cleanup();
  });
  it('dispatches valid claim story and handles evidence selection and clearing', () => {
    const onLockHeadline = vi.fn();

    render(
      <WriteScreen
        hasLocked={false}
        evidenceCards={[
          {
            id: 'ev-1',
            round: 1,
            location: 'bakery',
            claimType: 'danger',
            description: 'Exploded flour sacks in bakery',
          },
        ]}
        proofCards={[]}
        onLockHeadline={onLockHeadline}
        onSkipWrite={vi.fn()}
      />
    );

    // Pick Bakery and Danger
    fireEvent.click(screen.getByText('Bakery'));
    fireEvent.click(screen.getByText('Danger'));

    // Evidence checkbox should be visible
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDefined();
    fireEvent.click(checkbox);

    const textarea = screen.getByPlaceholderText('Write your front page headline (1–100 characters)...');
    fireEvent.change(textarea, { target: { value: 'Flour explosions rock the bakery ovens!' } });

    // Lock in headline
    fireEvent.click(screen.getByText('LOCK IT IN'));

    expect(onLockHeadline).toHaveBeenCalledWith({
      story: {
        kind: 'claim',
        location: 'bakery',
        claim: 'danger',
        attachEvidence: true,
      },
      text: 'Flour explosions rock the bakery ovens!',
    });

    // When location changes to Bank, evidence selection is cleared
    fireEvent.click(screen.getByText('Bank'));
    // Lock with Bank
    fireEvent.click(screen.getByText('LOCK IT IN'));
    expect(onLockHeadline).toHaveBeenLastCalledWith({
      story: {
        kind: 'claim',
        location: 'bank',
        claim: 'danger',
        attachEvidence: false,
      },
      text: 'Flour explosions rock the bakery ovens!',
    });
  });

  it('dispatches expose story with proof card and allows canceling expose', () => {
    const onLockHeadline = vi.fn();

    render(
      <WriteScreen
        hasLocked={false}
        evidenceCards={[]}
        proofCards={[
          {
            id: 'h1-2',
            targetPaperName: 'The Daily Gasp',
            headlineText: 'Aliens in bakery',
            location: 'bakery',
            claimType: 'weird_sighting',
          },
        ]}
        onLockHeadline={onLockHeadline}
        onSkipWrite={vi.fn()}
      />
    );

    // Click Expose button
    fireEvent.click(screen.getByText('Expose The Daily Gasp'));

    // Should prefill headline and show expose badge
    expect(screen.getByText('Exposing Rival Story')).toBeDefined();
    expect(
      screen.getByDisplayValue('EXPOSED: The Daily Gasp lied about Bakery!')
    ).toBeDefined();

    // Lock expose
    fireEvent.click(screen.getByText('LOCK IT IN'));

    expect(onLockHeadline).toHaveBeenCalledWith({
      story: {
        kind: 'expose',
        headlineId: 'h1-2',
      },
      text: 'EXPOSED: The Daily Gasp lied about Bakery!',
    });

    // Cancel expose
    fireEvent.click(screen.getByText('Cancel Expose'));
    expect(screen.queryByText('Exposing Rival Story')).toBeNull();
  });

  it('displays locked state with locked headline preview', () => {
    render(
      <WriteScreen
        hasLocked={true}
        lockedHeadline={{
          id: 'h1-0',
          story: { kind: 'claim', location: 'bakery', claim: 'danger', attachEvidence: false },
          text: 'Exclusive: Bakery secrets uncovered!',
        }}
        evidenceCards={[]}
        proofCards={[]}
        onLockHeadline={vi.fn()}
        onSkipWrite={vi.fn()}
      />
    );

    expect(screen.getByTestId('write-locked')).toBeDefined();
    expect(screen.getByText('“Exclusive: Bakery secrets uncovered!”')).toBeDefined();
  });

  it('displays server error banner when provided', () => {
    render(
      <WriteScreen
        hasLocked={false}
        serverError="Our lawyers won’t print that — try again"
        evidenceCards={[]}
        proofCards={[]}
        onLockHeadline={vi.fn()}
        onSkipWrite={vi.fn()}
      />
    );

    expect(screen.getByText('Our lawyers won’t print that — try again')).toBeDefined();
  });
});
