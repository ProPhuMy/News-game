import React, { useId } from 'react';
import type { Location, TownClaim } from '../../../shared/ids.ts';
import { LOCATION_NAMES } from '../../../shared/ids.ts';
import { CLAIM_LABELS } from '../mapper.ts';
import { keepFocus } from './keepFocus.ts';

export type InspectionResult =
  | { kind: 'evidence'; location: Location; claim: TownClaim; text: string }
  | { kind: 'proof' | 'nothing'; paperName: string; headlineText: string }
  | { kind: 'none' };

export interface InspectionReportProps {
  report: Exclude<InspectionResult, { kind: 'none' }>;
  /** Beside the editor: also say how to attach or use the result. */
  inEditor?: boolean;
}

// The certain answer from this seat's own check, unlike the vague tip. Text only: headlines are user data.
export const InspectionReport: React.FC<InspectionReportProps> = ({ report, inEditor = false }) => {
  const title = useId();
  return (
  <section className="inspection-report" aria-labelledby={title}>
    <h3 id={title} tabIndex={-1} ref={keepFocus}>Your inspection result</h3>
    {report.kind === 'evidence' ? (
      <>
        <p className="inspection-fact">
          {LOCATION_NAMES[report.location]}: <strong>{CLAIM_LABELS[report.claim]}</strong> (confirmed)
        </p>
        <p className="inspection-text">{report.text}</p>
        {inEditor && (
          <p className="inspection-howto">
            To print it with evidence, pick {LOCATION_NAMES[report.location]} and {CLAIM_LABELS[report.claim]} below, then tick the evidence box.
          </p>
        )}
      </>
    ) : (
      <>
        <p className="inspection-fact">
          {report.kind === 'proof'
            ? <>Proof found: <strong>{report.paperName}</strong> printed a lie.</>
            : <>Nothing conclusive about <strong>{report.paperName}</strong>&apos;s headline.</>}
        </p>
        {report.headlineText && <p className="inspection-text">&ldquo;{report.headlineText}&rdquo;</p>}
        {inEditor && report.kind === 'proof' && (
          <p className="inspection-howto">Use the Expose {report.paperName} button below to print it.</p>
        )}
      </>
    )}
  </section>
  );
};
