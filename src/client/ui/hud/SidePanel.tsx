import React from 'react';
import type { PaperColor } from '../components/PaperBadge';
import { PaperBadge } from '../components/PaperBadge';

export interface PaperView {
  seatId: number;
  paperName: string;
  playerName: string;
  color: PaperColor;
  readers: number;
  totalReaders: number;
  trust: number;
  score: number;
  isBot: boolean;
  isCaretaker: boolean;
  hasLocked: boolean;
}

export interface SidePanelProps {
  papers: PaperView[];
}

export const SidePanel: React.FC<SidePanelProps> = ({ papers }) => {
  return (
    <aside className="hud-side-panel" aria-label="Paper Standings">
      <h2 className="panel-title">Standings</h2>
      <div className="papers-list">
        {papers.map((paper) => (
          <div key={paper.seatId} className={`paper-card ${paper.hasLocked ? 'locked' : ''}`}>
            <div className="paper-card-header">
              <PaperBadge paperName={paper.paperName} color={paper.color} />
              {paper.hasLocked && (
                <span className="locked-badge" aria-label="Locked" title="Locked">
                  🔒
                </span>
              )}
            </div>
            <div className="paper-editor-line">
              <span className="editor-name">{paper.playerName}</span>
              {paper.isCaretaker && <span className="caretaker-tag"> (Caretaker)</span>}
              {paper.isBot && !paper.isCaretaker && <span className="bot-tag"> (AI)</span>}
            </div>
            <div className="paper-stats">
              <span className="stat-readers">
                <span className="stat-label">Readers now</span> <strong>{paper.readers}</strong>
              </span>
              <span className="stat-total-readers">
                <span className="stat-label">Total readers</span> <strong>{paper.totalReaders}</strong>
              </span>
              <span className="stat-score">Score: {paper.score}</span>
            </div>
            <div className="trust-bar-container">
              <div className="trust-bar-label">Trust: {Math.round(paper.trust)}</div>
              <div className="trust-bar-track">
                <div
                  className="trust-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, paper.trust))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
