import React, { useState, useEffect } from 'react';
import type { Color } from '../../../shared/ids.ts';
import { COLORS } from '../../../shared/ids.ts';
import { TUNING } from '../../../shared/tuning.ts';
import { Button } from '../components/Button.tsx';
import { PAPER_ICONS } from '../components/PaperBadge.tsx';

export interface JoinProfile {
  playerName: string;
  paperName: string;
  color: Color;
}

export interface JoinScreenProps {
  onSubmit: (profile: JoinProfile) => void;
  onBack?: () => void;
  takenColors?: Color[];
  defaultPlayerName?: string;
  defaultPaperName?: string;
  pending?: boolean;
  error?: string | null;
  roomCode?: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  onSubmit,
  onBack,
  takenColors = [],
  defaultPlayerName = '',
  defaultPaperName = '',
  pending = false,
  error,
  roomCode,
}) => {
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [paperName, setPaperName] = useState(defaultPaperName);
  const [color, setColor] = useState<Color | null>(() => {
    return COLORS.find((c) => !takenColors.includes(c)) ?? null;
  });

  // Revalidate selection if takenColors changes
  useEffect(() => {
    if (color && takenColors.includes(color)) {
      const nextAvailable = COLORS.find((c) => !takenColors.includes(c)) ?? null;
      setColor(nextAvailable);
    }
  }, [takenColors, color]);

  const allTaken = COLORS.every((c) => takenColors.includes(c));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || allTaken) return;
    if (!playerName.trim() || !paperName.trim() || !color) return;
    onSubmit({
      playerName: playerName.trim().slice(0, TUNING.limits.displayNameChars),
      paperName: paperName.trim().slice(0, TUNING.limits.paperNameChars),
      color,
    });
  };

  return (
    <div className="screen-container join-screen" data-testid="join-screen">
      <form onSubmit={handleSubmit} className="join-profile-card">
        <h2>Establish Your Press</h2>
        {roomCode && (
          <div className="join-room-badge" data-testid="join-room-badge">
            Joining room <strong>{roomCode}</strong>
          </div>
        )}

        {error && (
          <div className="screen-error-banner" role="alert" data-testid="join-error">
            {error}
          </div>
        )}

        {allTaken && (
          <div className="screen-error-banner" role="alert" data-testid="all-colors-taken">
            All 4 seats in this town are already occupied.
          </div>
        )}

        <div className="form-group">
          <label htmlFor="player-name">Your Name</label>
          <input
            id="player-name"
            type="text"
            maxLength={TUNING.limits.displayNameChars}
            required
            disabled={pending}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={`Editor Name (max ${TUNING.limits.displayNameChars})`}
          />
        </div>

        <div className="form-group">
          <label htmlFor="paper-name">Newspaper Name</label>
          <input
            id="paper-name"
            type="text"
            maxLength={TUNING.limits.paperNameChars}
            required
            disabled={pending}
            value={paperName}
            onChange={(e) => setPaperName(e.target.value)}
            placeholder={`The Daily Chronicle (max ${TUNING.limits.paperNameChars})`}
          />
        </div>

        <div className="form-group">
          <span className="form-label-title">Pick Ink Color &amp; Emblem</span>
          <div className="color-picker-grid">
            {COLORS.map((c) => {
              const isTaken = takenColors.includes(c);
              const isSelected = color === c;
              const icon = PAPER_ICONS[c];
              return (
                <button
                  key={c}
                  type="button"
                  disabled={isTaken || pending}
                  aria-label={`Select ${c.charAt(0).toUpperCase() + c.slice(1)}`}
                  className={`color-choice-btn color-${c} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setColor(c)}
                >
                  <span className="icon" aria-hidden="true">{icon.symbol}</span>
                  <span className="label">{c}</span>
                  {isTaken && <span className="taken-label">Taken</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="join-actions">
          <Button
            type="submit"
            variant="primary"
            disabled={pending || allTaken || !color || !playerName.trim() || !paperName.trim()}
            className="btn-large"
          >
            {pending ? 'Establishing...' : 'Claim Printing Press'}
          </Button>

          {onBack && (
            <Button type="button" variant="retro" onClick={onBack} disabled={pending}>
              Back
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
