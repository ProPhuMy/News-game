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
        <section className="final-card results-card" aria-labelledby="results-title">
          <header className="results-header">
            <h1 id="results-title">Final Edition Scoreboard</h1>
          </header>
          <div className="results-body">
            <p className="final-loading" role="status">Tabulating final editions and readers...</p>
          </div>
        </section>
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
      <section className="final-card results-card" aria-labelledby="results-title">
        <header className="results-header">
          <h1 id="results-title">Final Edition Scoreboard</h1>
          <p className="winner-announcement" role="status">
            {winners.length > 0 && <span className="winner-icon" aria-hidden="true">🏆 </span>}
            {winnerText}
          </p>
        </header>

        <div className="results-body" tabIndex={0} aria-label="Results, scores and headline history">
          <p className="formula-explanation">
            {`Score = Total readers × Trust ÷ ${TUNING.scoreTrustDivisor}, rounded`}
          </p>
          <div className="scoreboard-scroll">
            <ScoreboardTable scores={scoreboard} />
          </div>

          <section className="headline-truth-archive" data-testid="headline-truth-archive" aria-labelledby="truth-title">
            <h2 id="truth-title">The truth comes out</h2>
            {headlines.length === 0 ? (
              <p className="results-empty">No headlines were printed this match.</p>
            ) : (
              <ol className="archive-list">
                {headlines.map((h) => (
                  <li key={h.id} className="archive-item">
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
                  </li>
                ))}
              </ol>
            )}
          </section>

          {finalExposures.length > 0 && (
            <details className="final-exposures-section results-details" data-testid="final-exposures">
              <summary>Final edition scandals ({finalExposures.length})</summary>
              {finalExposures.map((e, idx) => (
                <div key={idx} className="final-exposure-item">
                  <strong>{e.paperName}:</strong> {e.reason}
                </div>
              ))}
            </details>
          )}

          {truthRecords.length > 0 && (
            <details className="truth-records-section results-details" data-testid="truth-records">
              <summary>Integrity records</summary>
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
            </details>
          )}
        </div>

        <footer className="final-actions results-footer">
          <Button variant="primary" onClick={onPlayAgain} className="btn-large">
            Play Again
          </Button>
        </footer>
      </section>
    </div>
  );
};
