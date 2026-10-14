import React, { useState } from 'react';
import type { Color } from '../../../shared/ids';
import { COLORS } from '../../../shared/ids';
import { Button } from '../components/Button';
import { PAPER_ICONS } from '../components/PaperBadge';

export interface JoinProfile {
  playerName: string;
  paperName: string;
  color: Color;
}

export interface JoinScreenProps {
  onSubmit: (profile: JoinProfile) => void;
  takenColors?: Color[];
  defaultPlayerName?: string;
  defaultPaperName?: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  onSubmit,
  takenColors = [],
  defaultPlayerName = '',
  defaultPaperName = '',
}) => {
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [paperName, setPaperName] = useState(defaultPaperName);
  const [color, setColor] = useState<Color | null>(() => {
    return COLORS.find((c) => !takenColors.includes(c)) || COLORS[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !paperName.trim() || !color) return;
    onSubmit({
      playerName: playerName.trim().slice(0, 20),
      paperName: paperName.trim().slice(0, 24),
      color,
    });
  };

  return (
    <div className="screen-container join-screen" data-testid="join-screen">
      <form onSubmit={handleSubmit} className="join-profile-card">
        <h2>Establish Your Press</h2>

        <div className="form-group">
          <label htmlFor="player-name">Your Name</label>
          <input
            id="player-name"
            type="text"
            maxLength={20}
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Editor Name (max 20)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="paper-name">Newspaper Name</label>
          <input
            id="paper-name"
            type="text"
            maxLength={24}
            required
            value={paperName}
            onChange={(e) => setPaperName(e.target.value)}
            placeholder="The Daily Chronicle (max 24)"
          />
        </div>

        <div className="form-group">
          <span className="form-label-title">Pick Ink Color & Emblem</span>
          <div className="color-picker-grid">
            {COLORS.map((c) => {
              const isTaken = takenColors.includes(c);
              const isSelected = color === c;
              const icon = PAPER_ICONS[c];
              return (
                <button
                  key={c}
                  type="button"
                  disabled={isTaken}
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

        <Button
          type="submit"
          variant="primary"
          disabled={!playerName.trim() || !paperName.trim() || !color}
        >
          Ready to Print
        </Button>
      </form>
    </div>
  );
};
