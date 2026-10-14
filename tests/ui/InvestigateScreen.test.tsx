/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigateScreen } from '../../src/client/ui/screens/InvestigateScreen';

describe('InvestigateScreen', () => {
  it('displays tip and allows choosing location check or skip', () => {
    const onInvestigateLocation = vi.fn();
    const onSkip = vi.fn();

    render(
      <InvestigateScreen
        tipText="A truck was seen outside the bakery at 3 AM."
        round={1}
        hasLocked={false}
        rivalHeadlines={[]}
        onInvestigateLocation={onInvestigateLocation}
        onInvestigateRival={vi.fn()}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText('A truck was seen outside the bakery at 3 AM.')).toBeDefined();

    fireEvent.click(screen.getByText('Bakery'));
    expect(onInvestigateLocation).toHaveBeenCalledWith('bakery');

    fireEvent.click(screen.getByText('Skip Investigation'));
    expect(onSkip).toHaveBeenCalled();
  });
});
