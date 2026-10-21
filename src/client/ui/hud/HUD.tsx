import React from 'react';
import type { Phase } from '../../../shared/ids';
import { TopBar } from './TopBar';
import type { PaperView } from './SidePanel';
import { SidePanel } from './SidePanel';

export interface HUDProps {
  round: number;
  phase: Phase;
  deadlineMs: number;
  serverTimeOffset: number;
  papers: PaperView[];
  error?: string | null;
  /** Optional strip directly under the top bar (the reveal's latest-edition ticker). */
  ticker?: React.ReactNode;
  children?: React.ReactNode;
}

export const HUD: React.FC<HUDProps> = ({
  round,
  phase,
  deadlineMs,
  serverTimeOffset,
  papers,
  error,
  ticker,
  children,
}) => {
  return (
    <div className="hud-overlay" data-testid="hud-overlay">
      <TopBar
        round={round}
        phase={phase}
        deadlineMs={deadlineMs}
        serverTimeOffset={serverTimeOffset}
      />
      {ticker}
      <div className="hud-body">
        <SidePanel papers={papers} />
        <main className="hud-center-content">
          {error && (
            <div className="screen-error-banner hud-error-banner" role="alert" data-testid="hud-error">
              {error}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
