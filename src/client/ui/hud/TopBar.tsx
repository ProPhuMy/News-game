import React from 'react';
import type { Phase } from '../../../shared/ids';
import { CountdownTimer } from '../components/CountdownTimer';
import { useSound } from '../audio/SoundContext';

const PHASE_LABELS: Record<Phase, string> = {
  intro: 'Welcome to Town',
  investigate: 'Investigate Leads',
  write: 'Write Headline',
  reveal: 'Front Pages Revealed',
  final: 'Final Edition',
  ended: 'Match Concluded',
};

export interface TopBarProps {
  round: number;
  phase: Phase;
  deadlineMs: number;
  serverTimeOffset: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  round,
  phase,
  deadlineMs,
  serverTimeOffset,
}) => {
  const { isMuted, toggleMute } = useSound();

  return (
    <header className="hud-top-bar" role="banner">
      <div className="round-badge">
        {phase === 'final' ? 'Final Edition' : `Round ${round} of 5`}
      </div>
      <div className="phase-title">{PHASE_LABELS[phase] || phase}</div>
      <div className="top-bar-controls">
        <CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset} />
        <button
          type="button"
          className="sound-toggle-btn"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  );
};
