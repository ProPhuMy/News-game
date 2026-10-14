/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WriteScreen } from '../../src/client/ui/screens/WriteScreen';

describe('WriteScreen', () => {
  it('enforces character limits, claim selection, and dispatches locked headline', () => {
    const onLockHeadline = vi.fn();

    render(
      <WriteScreen
        hasLocked={false}
        evidenceCards={[]}
        proofCards={[]}
        onLockHeadline={onLockHeadline}
        onSkipWrite={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Bakery'));
    fireEvent.click(screen.getByText('Danger'));

    const textarea = screen.getByPlaceholderText('Write your front page headline (1–100 characters)...');
    fireEvent.change(textarea, { target: { value: 'Flour explosions rock the bakery ovens!' } });

    expect(screen.getByText('39 / 100')).toBeDefined();

    const lockBtn = screen.getByText('LOCK IT IN');
    fireEvent.click(lockBtn);

    expect(onLockHeadline).toHaveBeenCalledWith({
      location: 'bakery',
      claimType: 'danger',
      text: 'Flour explosions rock the bakery ovens!',
      evidenceCardId: undefined,
      proofCardId: undefined,
    });
  });
});
