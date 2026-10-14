/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from '../../src/client/ui/screens/HomeScreen';

describe('HomeScreen', () => {
  it('triggers onPlaySolo and onCreateRoom actions', () => {
    const onPlaySolo = vi.fn();
    const onCreateRoom = vi.fn();
    const onJoinCode = vi.fn();

    render(
      <HomeScreen
        onPlaySolo={onPlaySolo}
        onCreateRoom={onCreateRoom}
        onJoinCode={onJoinCode}
      />
    );

    fireEvent.click(screen.getByText('Play Solo'));
    expect(onPlaySolo).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Create Room'));
    expect(onCreateRoom).toHaveBeenCalled();
  });
});
