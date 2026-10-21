import React from 'react';
import type { FrontPageView } from './FrontPageCard.tsx';
import { PaperBadge } from './PaperBadge.tsx';

// Latest-edition ticker (presentation interface §5c): every published headline of the round, in seat order, as text.
// It lists headlines side by side and never implies one of them caused every citizen reaction.
export interface EditionTickerProps {
  pages: FrontPageView[];
}

const Items: React.FC<{ pages: FrontPageView[] }> = ({ pages }) => (
  <>
    {pages.map((page) => (
      <li key={page.seatId} className="ticker-item">
        <PaperBadge paperName={page.paperName} color={page.color} />
        <span className="ticker-headline">“{page.headlineText}”</span>
        {page.isExposed && <span className="ticker-exposed">EXPOSED</span>}
      </li>
    ))}
  </>
);

export const EditionTicker: React.FC<EditionTickerProps> = ({ pages }) => {
  const ordered = pages.filter((page) => !page.unpublished).sort((a, b) => a.seatId - b.seatId);
  return (
    <section className="edition-ticker" role="region" aria-label="Latest edition">
      <span className="ticker-label" aria-hidden="true">Latest edition</span>
      {ordered.length === 0 ? (
        <p className="ticker-empty">No front pages this edition</p>
      ) : (
        <div className="ticker-viewport">
          <ul className="ticker-track"><Items pages={ordered} /></ul>
          {/* Second copy makes the marquee loop seamlessly; screen readers get the first list only. */}
          <ul className="ticker-track" aria-hidden="true"><Items pages={ordered} /></ul>
        </div>
      )}
    </section>
  );
};
