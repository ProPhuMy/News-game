import React, { useState, useEffect } from 'react';
import type { Phase } from '../../../shared/ids.ts';
import { TUNING } from '../../../shared/tuning.ts';
import { CountdownTimer } from '../components/CountdownTimer.tsx';
import { WRITE_WARNING_SECONDS } from '../screens/WriteScreen.tsx';
import { useSound } from '../audio/SoundContext.tsx';
import { RulesButton } from '../components/RulesDialog.tsx';

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
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('news_town_reduced_motion');
      if (saved !== null) return saved === 'true';
    } catch {
      // storage access denied
    }
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (reducedMotion) {
        document.documentElement.setAttribute('data-reduced-motion', 'true');
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.removeAttribute('data-reduced-motion');
        document.documentElement.classList.remove('reduced-motion');
      }
    }
  }, [reducedMotion]);

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('news_town_reduced_motion', String(next));
      } catch {
        // storage access denied
      }
      return next;
    });
  };

  return (
    <header className="hud-top-bar" role="banner">
      <div className="round-badge">
        {phase === 'final' ? 'Final Edition' : phase === 'intro' ? 'Get Ready' : `Round ${round} of ${TUNING.rounds}`}
      </div>
      <div className="phase-title">{PHASE_LABELS[phase] || phase}</div>
      <div className="top-bar-controls">
        <CountdownTimer deadlineMs={deadlineMs} serverTimeOffset={serverTimeOffset}
          urgentAtSeconds={phase === 'write' ? WRITE_WARNING_SECONDS : undefined} />
        <RulesButton />
        <button
          type="button"
          className="motion-toggle-btn"
          onClick={toggleReducedMotion}
          aria-label={reducedMotion ? 'Enable animations' : 'Reduce motion'}
          title={reducedMotion ? 'Enable animations' : 'Reduce motion'}
        >
          {reducedMotion ? '🎬' : '🛑'}
        </button>
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
