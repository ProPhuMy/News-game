import React from 'react';
import type { FrontPageView } from '../components/FrontPageCard';
import { FrontPageCard } from '../components/FrontPageCard';
import type { ExposureEvent } from '../components/ExposureBanner';
import { ExposureBanner } from '../components/ExposureBanner';
import { RecapBanner } from '../components/RecapBanner';

export interface RevealScreenProps {
  frontPages: FrontPageView[];
  exposures: ExposureEvent[];
  recap: string;
  bubbles?: string[];
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  frontPages,
  exposures,
  recap,
  bubbles = [],
}) => {
  // Respect spec limit of at most 6 bubbles
  const displayBubbles = bubbles.slice(0, 6);

  return (
    <div className="screen-container reveal-screen" data-testid="reveal-screen">
      <ExposureBanner exposures={exposures} />

      <div className="front-pages-carousel">
        {frontPages.map((page, index) => (
          <FrontPageCard key={page.id ?? `${page.seatId}-${index}`} page={page} />
        ))}
      </div>

      {displayBubbles.length > 0 && (
        <div className="speech-bubbles-overlay" aria-label="Citizen reactions">
          {displayBubbles.map((msg, i) => (
            <div key={i} className="citizen-speech-bubble">
              <span className="bubble-icon" aria-hidden="true">💬</span>{' '}
              <span className="bubble-text">{msg}</span>
            </div>
          ))}
        </div>
      )}

      <RecapBanner recap={recap} />
    </div>
  );
};
