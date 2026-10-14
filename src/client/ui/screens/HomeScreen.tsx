import React, { useState } from 'react';
import { Button } from '../components/Button';

export interface HomeScreenProps {
  onPlaySolo: () => void;
  onCreateRoom: () => void;
  onJoinCode: (code: string) => void;
  pending?: boolean;
  error?: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlaySolo,
  onCreateRoom,
  onJoinCode,
  pending = false,
  error,
}) => {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const cleaned = roomCode.trim().toUpperCase();
    if (cleaned.length === 5) {
      onJoinCode(cleaned);
    }
  };

  return (
    <div className="screen-container home-screen" data-testid="home-screen">
      <div className="home-card">
        <h1 className="game-title">NEWS TOWN</h1>
        <p className="game-subtitle">The 3D multiplayer newspaper party game</p>

        {error && (
          <div className="screen-error-banner" role="alert" data-testid="home-error">
            {error}
          </div>
        )}

        <div className="home-actions">
          <Button variant="primary" onClick={onPlaySolo} disabled={pending} className="btn-large">
            {pending ? 'Connecting...' : 'Play Solo'}
          </Button>
          <Button variant="secondary" onClick={onCreateRoom} disabled={pending} className="btn-large">
            Create Room
          </Button>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <label htmlFor="join-code-input" className="form-label">
            Have a room code?
          </label>
          <div className="join-input-group">
            <input
              id="join-code-input"
              type="text"
              maxLength={5}
              placeholder="CODE"
              value={roomCode}
              disabled={pending}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="code-input"
            />
            <Button
              type="submit"
              variant="retro"
              disabled={pending || roomCode.trim().length !== 5}
            >
              Join
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
