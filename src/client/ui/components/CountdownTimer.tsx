import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  deadlineMs: number;
  serverTimeOffset?: number;
  onExpire?: () => void;
  /** Seconds left at which the timer turns red (default 5). */
  urgentAtSeconds?: number;
}

/** Whole seconds left until a server deadline. Display only: the server owns every phase change. */
export const useSecondsLeft = (deadlineMs: number, serverTimeOffset = 0, onExpire?: () => void): number => {
  const computeSecondsLeft = () => {
    const currentServerTime = Date.now() + serverTimeOffset;
    return Math.max(0, Math.ceil((deadlineMs - currentServerTime) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsLeft);

  useEffect(() => {
    setSecondsLeft(computeSecondsLeft());
    const interval = setInterval(() => {
      const remaining = computeSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [deadlineMs, serverTimeOffset, onExpire]);

  return secondsLeft;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadlineMs,
  serverTimeOffset = 0,
  onExpire,
  urgentAtSeconds = 5,
}) => {
  const secondsLeft = useSecondsLeft(deadlineMs, serverTimeOffset, onExpire);
  const isUrgent = secondsLeft <= urgentAtSeconds && secondsLeft > 0;

  return (
    <div
      className={`countdown-timer ${isUrgent ? 'urgent' : ''}`}
      role="timer"
      aria-live="polite"
    >
      <span className="timer-value">{secondsLeft}s</span>
    </div>
  );
};
