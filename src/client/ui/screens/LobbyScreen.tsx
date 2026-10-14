import React, { useState } from 'react';
import { Button } from '../components/Button';
import type { PaperColor } from '../components/PaperBadge';
import { PaperBadge } from '../components/PaperBadge';

export interface LobbySeat {
  seatId: number;
  playerName: string | null;
  paperName: string | null;
  color: PaperColor | null;
  isBot: boolean;
}

export interface LobbyScreenProps {
  roomCode: string;
  isHost: boolean;
  seats: LobbySeat[];
  onStartMatch: () => void;
  onLeaveRoom?: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  isHost,
  seats,
  onStartMatch,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/r/${roomCode}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Clipboard fallback
      });
    }
  };

  return (
    <div className="screen-container lobby-screen" data-testid="lobby-screen">
      <div className="lobby-card">
        <div className="lobby-header">
          <h1>Newsroom Lobby</h1>
          <div className="room-code-badge">
            <span>Room Code: {roomCode}</span>
            <Button variant="retro" onClick={handleCopyLink} className="btn-sm">
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </Button>
          </div>
        </div>

        <div className="seats-grid">
          {seats.map((seat) => (
            <div
              key={seat.seatId}
              className={`seat-card ${seat.playerName ? 'occupied' : 'empty'}`}
            >
              <div className="seat-number">Press #{seat.seatId + 1}</div>
              {seat.playerName && seat.paperName && seat.color ? (
                <div className="seat-info">
                  <PaperBadge paperName={seat.paperName} color={seat.color} />
                  <div className="seat-player-name">{seat.playerName}</div>
                </div>
              ) : (
                <div className="seat-empty-message">
                  AI paper will take this seat
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="lobby-footer">
          {isHost ? (
            <Button variant="primary" onClick={onStartMatch} className="btn-large">
              Start Match
            </Button>
          ) : (
            <div className="waiting-message">Waiting for the host to start the presses...</div>
          )}
          {onLeaveRoom && (
            <Button variant="secondary" onClick={onLeaveRoom}>
              Leave Room
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
