import React, { useId, useRef } from 'react';
import { StepArt, type OnboardingStep } from './OnboardingArt';
import { RULE_CARDS, RULE_DETAILS } from '../../../content/rule-cards.ts';
import { APPROVED_PALETTE, getPalette } from '../../visuals/palette.ts';

// "How to play": the three illustrated steps plus the full rules, available in every phase.
// Purely informational: it never pauses the game, because the server owns every timer.
export const RulesButton: React.FC = () => {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const title = useId();
  const palette = getPalette(APPROVED_PALETTE);
  return (
    <>
      <button ref={opener} type="button" className="rules-btn" aria-label="How to play" title="How to play"
        onClick={() => dialog.current?.showModal()}>
        ?
      </button>
      <dialog ref={dialog} className="rules-dialog" aria-labelledby={title} onClose={() => opener.current?.focus()}>
        <div className="rules-dialog-head">
          <h2 id={title}>How to play</h2>
          <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        <ol className="rules-steps">
          {RULE_CARDS.map((card, idx) => (
            <li key={card.title} className="rules-step">
              <StepArt step={(idx + 1) as OnboardingStep} palette={palette} className="onboarding-art" />
              <div>
                <h3><span className="card-index" aria-hidden="true">{idx + 1}</span>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="rules-details-title">The full rules</h3>
        {RULE_DETAILS.map((card) => (
          <section key={card.title} className="rules-detail">
            <h4>{card.title}</h4>
            <p>{card.body}</p>
          </section>
        ))}
      </dialog>
    </>
  );
};
