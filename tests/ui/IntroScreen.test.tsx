/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntroScreen } from '../../src/client/ui/screens/IntroScreen';

describe('IntroScreen', () => {
  it('renders 3 rule cards and triggers onSkipIntro when clicked', () => {
    const onSkipIntro = vi.fn();
    render(
      <IntroScreen
        deadlineMs={Date.now() + 20000}
        serverTimeOffset={0}
        onSkipIntro={onSkipIntro}
      />
    );

    expect(screen.getByText('Rule 1: Print Truth or Lies')).toBeDefined();
    expect(screen.getByText('Rule 2: Win Citizens, Risk Trust')).toBeDefined();
    expect(screen.getByText('Rule 3: Final Score = Readers × Trust')).toBeDefined();

    const skipBtn = screen.getByText('Skip Intro');
    fireEvent.click(skipBtn);
    expect(onSkipIntro).toHaveBeenCalled();
  });
});
