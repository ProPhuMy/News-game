/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountdownTimer } from '../../src/client/ui/components/CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders remaining seconds calculated strictly from server deadline', () => {
    const now = 100000;
    vi.setSystemTime(now);
    const deadlineMs = now + 15000; // 15s remaining

    render(<CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={0} />);
    expect(screen.getByText('15s')).toBeDefined();

    vi.advanceTimersByTime(5000);
  });
});
