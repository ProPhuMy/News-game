import React from 'react';

export interface RecapBannerProps {
  recap: string;
}

export const RecapBanner: React.FC<RecapBannerProps> = ({ recap }) => {
  return (
    <div className="recap-banner" role="status" data-testid="recap-banner">
      <span className="recap-icon" aria-hidden="true">📢</span>
      <span className="recap-text">{recap}</span>
    </div>
  );
};
