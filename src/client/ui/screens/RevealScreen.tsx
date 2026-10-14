import React from 'react';
import type { FrontPageView } from '../components/FrontPageCard.tsx';
import { FrontPageCard } from '../components/FrontPageCard.tsx';
import type { ExposureEvent } from '../components/ExposureBanner.tsx';
import { ExposureBanner } from '../components/ExposureBanner.tsx';
import { RecapBanner } from '../components/RecapBanner.tsx';
import { TUNING } from '../../../shared/tuning.ts';

export interface RevealScreenProps {
  frontPages: FrontPageView[];
  exposures: ExposureEvent[];
  recap: string;
  bubbles?: string[];
  showBubbles?: boolean;
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  frontPages,
  exposures,
  recap,
  bubbles = [],
  showBubbles,
}) => {
  // Bubbles are rendered by the 3D town view; only render in 2D UI when in fallback mode or explicitly requested
  const isTownFallback =
    typeof document !== 'undefined' && Boolean(document.querySelector('.town-fallback-container'));
  const shouldRenderBubbles = showBubbles ?? isTownFallback;

  // Respect spec limit of at most TUNING.limits.maxBubbles
  const displayBubbles = bubbles.slice(0, TUNING.limits.maxBubbles);

  return (
    <div className="screen-container reveal-screen" data-testid="reveal-screen">
      <ExposureBanner exposures={exposures} />

      <div className="front-pages-carousel">
        {frontPages.map((page, index) => (
          <FrontPageCard key={page.id ?? `${page.seatId}-${index}`} page={page} />
        ))}
      </div>

      {shouldRenderBubbles && displayBubbles.length > 0 && (
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
