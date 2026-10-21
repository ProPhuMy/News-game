import React from 'react';
import type { PaperColor } from './PaperBadge';
import { PaperBadge } from './PaperBadge';

export interface FrontPageView {
  id?: string;
  seatId: number;
  paperName: string;
  color: PaperColor;
  headlineText: string;
  hasEvidence: boolean;
  isExposed: boolean;
  exposureReason?: string;
  /** True for the placeholder card of a seat that published nothing this round. */
  unpublished?: boolean;
}

export interface FrontPageCardProps {
  page: FrontPageView;
}

export const FrontPageCard: React.FC<FrontPageCardProps> = ({ page }) => {
  return (
    <article
      className={`front-page-card paper-border-${page.color} ${page.isExposed ? 'exposed' : ''}`}
      data-testid={`front-page-${page.seatId}`}
    >
      <div className="newspaper-masthead">
        <PaperBadge paperName={page.paperName} color={page.color} />
        <div className="masthead-date">SPECIAL EDITION</div>
      </div>

      <div className="headline-body">
        <h2 className="headline-text">{page.headlineText}</h2>
      </div>

      <div className="front-page-badges">
        {page.hasEvidence && <span className="evidence-stamp">VERIFIED TRUTH</span>}
        {page.isExposed && (
          <div className="exposed-stamp-container">
            <span className="exposed-stamp">THE TRUTH COMES OUT</span>
            {page.exposureReason && <p className="exposed-reason">{page.exposureReason}</p>}
          </div>
        )}
      </div>
    </article>
  );
};
