import React from 'react';
import type { FinalScoreRow } from '../components/ScoreboardTable';
import { ScoreboardTable } from '../components/ScoreboardTable';
import { Button } from '../components/Button';
import type { ExposureEvent } from '../components/ExposureBanner';
import type { FinalHeadlineSummary, TruthRecordView } from '../mapper';
import { TUNING } from '../../../shared/tuning';

export interface FinalEditionScreenProps {
  scoreboard: FinalScoreRow[];
  truthRecords?: TruthRecordView[];
  finalExposures?: ExposureEvent[];
  headlines?: FinalHeadlineSummary[];
  onPlayAgain: () => void;
}

export const FinalEditionScreen: React.FC<FinalEditionScreenProps> = ({
  scoreboard,
  truthRecords = [],
  finalExposures = [],
  headlines = [],
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
          {`Score = Total readers × Trust ÷ ${TUNING.scoreTrustDivisor}, rounded`}
        </p>

        <ScoreboardTable scores={scoreboard} />

        {finalExposures.length > 0 && (
          <div className="final-exposures-section" data-testid="final-exposures">
            <h2>🚨 Final Edition Scandals</h2>
            {finalExposures.map((e, idx) => (
              <div key={idx} className="final-exposure-item">
                <strong>{e.paperName}:</strong> {e.reason}
              </div>
            ))}
          </div>
        )}

        {truthRecords.length > 0 && (
          <div className="truth-records-section" data-testid="truth-records">
            <h2>📜 Newspaper Integrity Records</h2>
            <div className="truth-records-grid">
              {truthRecords.map((rec) => (
                <div key={rec.paperName} className="truth-record-card">
                  <h3>{rec.paperName}</h3>
                  <p>Lies Told: {rec.liesTold}</p>
                  <p>Caught &amp; Exposed: {rec.liesCaught}</p>
                  <p>Escaped Uncaught: {rec.liesEscaped}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {headlines.length > 0 && (
          <div className="headline-truth-archive" data-testid="headline-truth-archive">
            <h2>📰 Match Headlines &amp; Truths</h2>
            <div className="archive-list">
              {headlines.map((h) => (
                <div key={h.id} className="archive-item">
                  <span className="archive-round">Round {h.round}</span>
                  <span className="archive-paper">{h.paperName}</span>
                  <span className="archive-text">"{h.text}"</span>
                  <span className={`archive-truth truth-${h.truth}`}>
                    {h.truth === 'true'
                      ? '✓ TRUE'
                      : h.exposed
                      ? '✗ EXPOSED LIE'
                      : '⚠ UNCAUGHT LIE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="final-actions">
          <Button variant="primary" onClick={onPlayAgain} className="btn-large">
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
};
