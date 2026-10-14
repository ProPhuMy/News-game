import React from 'react';
import type { FinalScoreRow } from '../components/ScoreboardTable';
import { ScoreboardTable } from '../components/ScoreboardTable';
import { Button } from '../components/Button';

export interface FinalEditionScreenProps {
  scoreboard: FinalScoreRow[];
  onPlayAgain: () => void;
}

export const FinalEditionScreen: React.FC<FinalEditionScreenProps> = ({
  scoreboard,
  onPlayAgain,
}) => {
  const winners = scoreboard.filter((s) => s.isWinner);
  const winnerText =
    winners.length > 1
      ? `Co-Winners: ${winners.map((w) => w.paperName).join(' & ')}!`
      : `Winner: ${winners[0]?.paperName || 'The Town'}!`;

  return (
    <div className="screen-container final-edition-screen" data-testid="final-edition-screen">
      <div className="final-card">
        <h1>Final Edition Scoreboard</h1>
        <div className="winner-announcement" role="status">
          {winnerText}
        </div>
        <p className="formula-explanation">
          Score = total readers × (final trust ÷ 50)
        </p>

        <ScoreboardTable scores={scoreboard} />

        <div className="final-actions">
          <Button variant="primary" onClick={onPlayAgain} className="btn-large">
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
};
