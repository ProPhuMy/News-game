import React from 'react';

export interface ExposureEvent {
  paperName: string;
  reason: string;
}

export interface ExposureBannerProps {
  exposures: ExposureEvent[];
}

export const ExposureBanner: React.FC<ExposureBannerProps> = ({ exposures }) => {
  if (exposures.length === 0) return null;
  return (
    <div className="exposure-banner" role="alert" data-testid="exposure-banner">
      <h3>🚨 SCANDAL REPORT</h3>
      {exposures.map((e, idx) => (
        <div key={idx} className="exposure-entry">
          <strong>{e.paperName}:</strong> {e.reason}
        </div>
      ))}
    </div>
  );
};
