/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RulesButton } from '../../src/client/ui/components/RulesDialog';
import { RULE_CARDS, RULE_DETAILS } from '../../src/content/rule-cards';

// jsdom has <dialog> but no showModal/close; give it the minimal native behavior.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal(): void; close(): void };
  if (!proto.showModal) proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  if (!proto.close) proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});

describe('How to play', () => {
  afterEach(cleanup);

  it('opens a dialog with the three illustrated steps and the full rules', () => {
    const { container } = render(<RulesButton />);
    const dialog = container.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(3);
    for (const card of [...RULE_CARDS, ...RULE_DETAILS]) {
      expect(within(dialog).getByText(card.title)).toBeDefined();
      expect(within(dialog).getByText(card.body)).toBeDefined();
    }
  });

  it('closes with Close and returns focus to the button', () => {
    const { container } = render(<RulesButton />);
    const opener = screen.getByRole('button', { name: 'How to play' });
    fireEvent.click(opener);
    fireEvent.click(within(container.querySelector('dialog')!).getByRole('button', { name: 'Close' }));
    expect(container.querySelector('dialog')!.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes on Esc (native cancel then close) and returns focus; takes no store props, so it cannot send actions', () => {
    const { container } = render(<RulesButton />);
    const opener = screen.getByRole('button', { name: 'How to play' });
    fireEvent.click(opener);
    const dialog = container.querySelector('dialog')!;
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    dialog.close();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
