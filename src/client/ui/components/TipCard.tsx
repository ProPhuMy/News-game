import React from 'react';

export interface TipCardProps {
  tipText: string;
}

export const TipCard: React.FC<TipCardProps> = ({ tipText }) => {
  return (
    <div className="tip-card" role="region" aria-label="Confidential Tip">
      <div className="tip-stamp">CONFIDENTIAL TIP</div>
      <p className="tip-text">{tipText}</p>
      <p className="tip-note">A hint, not proof.</p>
    </div>
  );
};
