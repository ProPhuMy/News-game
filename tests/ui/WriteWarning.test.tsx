/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { WriteScreen } from '../../src/client/ui/screens/WriteScreen';
import { CountdownTimer } from '../../src/client/ui/components/CountdownTimer';

const base = { hasLocked: false, evidenceCards: [], proofCards: [], onLockHeadline: vi.fn(), onSkipWrite: vi.fn() };

describe('Write time warning (user-approved 2026-10-26: warn at 10 s left)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('appears once 10 s are left on the server deadline, not before', () => {
    render(<WriteScreen {...base} deadlineMs={100_000 + 12_000} serverTimeOffset={0} />);
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(screen.getByRole('alert').textContent).toBe('10 s left — lock it in!');
  });

  it('uses the server clock offset', () => {
    render(<WriteScreen {...base} deadlineMs={100_000 + 12_000} serverTimeOffset={3_000} />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('turns the timer urgent at the given threshold', () => {
    const { container } = render(<CountdownTimer deadlineMs={100_000 + 9_000} urgentAtSeconds={10} />);
    expect(container.querySelector('.countdown-timer.urgent')).not.toBeNull();
    cleanup();
    const { container: c2 } = render(<CountdownTimer deadlineMs={100_000 + 9_000} />);
    expect(c2.querySelector('.countdown-timer.urgent')).toBeNull();
  });
});
