/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { CountdownTimer } from '../../src/client/ui/components/CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders remaining seconds and advances on timer tick', () => {
    const now = 100000;
    vi.setSystemTime(now);
    const deadlineMs = now + 15000; // 15s remaining

    render(<CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={0} />);
    expect(screen.getByText('15s')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('10s')).toBeDefined();
  });

  it('applies server-time offset for skewed client clocks', () => {
    const now = 100000;
    vi.setSystemTime(now);
    // Server clock is 3 seconds ahead of client: offset = +3000ms
    // Actual server time is now + 3000 = 103000
    // Deadline is 115000 -> 12 seconds remaining
    const deadlineMs = now + 15000;
    const serverTimeOffset = 3000;

    render(<CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset} />);
    expect(screen.getByText('12s')).toBeDefined();
  });

  it('updates remaining time when deadlineMs changes', () => {
    const now = 100000;
    vi.setSystemTime(now);

    const { rerender } = render(<CountdownTimer deadlineMs={now + 20000} serverTimeOffset={0} />);
    expect(screen.getByText('20s')).toBeDefined();

    // Server extends deadline by 10s
    rerender(<CountdownTimer deadlineMs={now + 30000} serverTimeOffset={0} />);
    expect(screen.getByText('30s')).toBeDefined();
  });

  it('triggers onExpire and clamps at 0s with urgent style', () => {
    const now = 100000;
    vi.setSystemTime(now);
    const onExpire = vi.fn();

    render(<CountdownTimer deadlineMs={now + 4000} serverTimeOffset={0} onExpire={onExpire} />);

    // 4s is urgent
    const timerEl = screen.getByRole('timer');
    expect(timerEl.className).toContain('urgent');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('0s')).toBeDefined();
    expect(onExpire).toHaveBeenCalled();
  });
});
