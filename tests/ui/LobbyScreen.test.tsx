/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyScreen } from '../../src/client/ui/screens/LobbyScreen';
import type { LobbySeat } from '../../src/client/ui/screens/LobbyScreen';

describe('LobbyScreen', () => {
  const mockSeats: LobbySeat[] = [
    { seatId: 0, playerName: 'Alice', paperName: 'The Bugle', color: 'red', isBot: false },
    { seatId: 1, playerName: 'Bob', paperName: 'The Gazette', color: 'blue', isBot: false },
    { seatId: 2, playerName: null, paperName: null, color: null, isBot: true },
    { seatId: 3, playerName: null, paperName: null, color: null, isBot: true },
  ];

  it('renders room code, seats, AI fill indicators, and allows host to start', () => {
    const onStartMatch = vi.fn();
    render(
      <LobbyScreen
        roomCode="XK7PQ"
        isHost={true}
        seats={mockSeats}
        onStartMatch={onStartMatch}
      />
    );

    expect(screen.getByText('Room Code: XK7PQ')).toBeDefined();
    expect(screen.getByText('The Bugle')).toBeDefined();
    expect(screen.getAllByText('AI paper will take this seat')).toHaveLength(2);

    const startBtn = screen.getByText('Start Match');
    fireEvent.click(startBtn);
    expect(onStartMatch).toHaveBeenCalled();
  });
});
