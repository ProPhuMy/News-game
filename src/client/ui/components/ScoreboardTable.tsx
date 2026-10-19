import React from 'react';
import type { PaperColor } from './PaperBadge';
import { PaperBadge } from './PaperBadge';

export interface FinalScoreRow {
  seatId: number;
  paperName: string;
  playerName: string;
  color: PaperColor;
  totalReaders: number;
  finalTrust: number;
  finalScore: number;
  truthRecord: string;
  isWinner: boolean;
}

export interface ScoreboardTableProps {
  scores: FinalScoreRow[];
}

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ scores }) => {
  return (
    <table className="scoreboard-table" data-testid="scoreboard-table">
      <thead>
        <tr>
          <th>Paper</th>
          <th>Final Score</th>
          <th>Total readers</th>
          <th>Final Trust</th>
          <th>Truth Record</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((row) => (
          <tr key={row.seatId} className={row.isWinner ? 'winner-row' : ''}>
            <td>
              <PaperBadge paperName={row.paperName} color={row.color} />
              <div className="player-sub">{row.playerName}</div>
            </td>
            <td className="score-cell">
              <strong className="score-value">Score: {row.finalScore}</strong>
              {row.isWinner && <span className="winner-trophy" aria-label="Winner trophy"> 🏆</span>}
            </td>
            <td>{row.totalReaders}</td>
            <td>{Math.round(row.finalTrust)} / 100</td>
            <td>{row.truthRecord}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
