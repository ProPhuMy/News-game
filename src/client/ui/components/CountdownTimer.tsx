import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  deadlineMs: number;
  serverTimeOffset?: number;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadlineMs,
  serverTimeOffset = 0,
  onExpire,
}) => {
  const computeSecondsLeft = () => {
    const currentServerTime = Date.now() + serverTimeOffset;
    return Math.max(0, Math.ceil((deadlineMs - currentServerTime) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsLeft);

  useEffect(() => {
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

  const isUrgent = secondsLeft <= 5 && secondsLeft > 0;

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
