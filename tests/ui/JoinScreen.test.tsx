/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { JoinScreen } from '../../src/client/ui/screens/JoinScreen';

describe('JoinScreen', () => {
  afterEach(() => {
    cleanup();
  });

  it('validates player and paper names within character limits', () => {
    const onSubmit = vi.fn();
    render(<JoinScreen onSubmit={onSubmit} takenColors={['red']} />);

    const nameInput = screen.getByLabelText('Your Name');
    const paperInput = screen.getByLabelText('Newspaper Name');
    const submitBtn = screen.getByText('Claim Printing Press');

    fireEvent.change(nameInput, { target: { value: 'Editor Jane' } });
    fireEvent.change(paperInput, { target: { value: 'The Daily Herald' } });
    fireEvent.click(screen.getByLabelText('Select Blue'));
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      playerName: 'Editor Jane',
      paperName: 'The Daily Herald',
      color: 'blue',
    });
  });

  it('displays error message and disables submission when all colors are taken', () => {
    render(
      <JoinScreen
        onSubmit={vi.fn()}
        takenColors={['red', 'blue', 'green', 'gold']}
        error="Room is full"
      />
    );

    expect(screen.getByTestId('join-error')).toBeDefined();
    expect(screen.getByTestId('all-colors-taken')).toBeDefined();
    const submitBtn = screen.getByRole('button', { name: 'Claim Printing Press' });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });

  it('renders room code badge when roomCode prop is provided', () => {
    render(
      <JoinScreen
        onSubmit={vi.fn()}
        roomCode="EXTRA"
      />
    );

    const badge = screen.getByTestId('join-room-badge');
    expect(badge).toBeDefined();
    expect(screen.getByText('EXTRA')).toBeDefined();
    expect(screen.getByText(/Joining room/)).toBeDefined();
  });
});
