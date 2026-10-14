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
  children?: React.ReactNode;
}

export const HUD: React.FC<HUDProps> = ({
  round,
  phase,
  deadlineMs,
  serverTimeOffset,
  papers,
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
      <div className="hud-body">
        <SidePanel papers={papers} />
        <main className="hud-center-content">{children}</main>
      </div>
    </div>
  );
};
