/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JoinScreen } from '../../src/client/ui/screens/JoinScreen';

describe('JoinScreen', () => {
  it('validates player and paper names within character limits', () => {
    const onSubmit = vi.fn();
    render(<JoinScreen onSubmit={onSubmit} takenColors={['red']} />);

    const nameInput = screen.getByLabelText('Your Name');
    const paperInput = screen.getByLabelText('Newspaper Name');
    const submitBtn = screen.getByText('Ready to Print');

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
});
