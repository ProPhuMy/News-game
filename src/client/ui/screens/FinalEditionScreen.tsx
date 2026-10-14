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
  if (scoreboard.length === 0) {
    return (
      <div className="screen-container final-edition-screen" data-testid="final-edition-screen">
        <div className="final-card">
          <h1>Final Edition Scoreboard</h1>
          <div className="final-loading" role="status">
            Tabulating final editions and readers...
          </div>
        </div>
      </div>
    );
  }

  const winners = scoreboard.filter((s) => s.isWinner);
  const winnerText =
    winners.length > 1
      ? `Co-Winners: ${winners.map((w) => w.paperName).join(' & ')}!`
      : winners.length === 1
      ? `Winner: ${winners[0]?.paperName}!`
      : 'No Winner Announced';

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
