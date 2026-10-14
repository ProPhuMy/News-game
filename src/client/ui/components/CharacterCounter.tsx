import React from 'react';

export interface CharacterCounterProps {
  current: number;
  max: number;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, max }) => {
  const isNearLimit = current >= max - 10;
  return (
    <span
      className={`char-counter ${isNearLimit ? 'near-limit' : ''}`}
      aria-label={`${current} of ${max} characters used`}
    >
      {current} / {max}
    </span>
  );
};
