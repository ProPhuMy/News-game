import React, { useState } from 'react';
import type { Location } from '../../../shared/ids';
import { LOCATIONS, LOCATION_NAMES } from '../../../shared/ids';
import { TipCard } from '../components/TipCard';
import { Button } from '../components/Button';

export interface RivalHeadlineOption {
  id: string;
  paperName: string;
  round: number;
  text: string;
}

export interface InvestigateScreenProps {
  tipText: string;
  round: number;
  hasLocked: boolean;
  rivalHeadlines: RivalHeadlineOption[];
  onInvestigateLocation: (loc: Location) => void;
  onInvestigateRival: (headlineId: string) => void;
  onSkip: () => void;
  pending?: boolean;
  serverError?: string | null;
}

export const InvestigateScreen: React.FC<InvestigateScreenProps> = ({
  tipText,
  round,
  hasLocked,
  rivalHeadlines,
  onInvestigateLocation,
  onInvestigateRival,
  onSkip,
  pending = false,
  serverError,
}) => {
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');

  if (hasLocked) {
    return (
      <div className="investigate-panel locked-state" data-testid="investigate-locked">
        <TipCard tipText={tipText} />
        <div className="locked-banner">✓ Investigation order locked in. Waiting for report...</div>
      </div>
    );
  }

  return (
    <div className="investigate-panel" data-testid="investigate-panel">
      <TipCard tipText={tipText} />

      {serverError && (
        <div className="screen-error-banner" role="alert" data-testid="investigate-error">
          {serverError}
        </div>
      )}

      <div className="investigate-choices">
        <section className="choice-section">
          <h3>Option A: Check a Town Location (Certain Truth &amp; Evidence)</h3>
          <div className="locations-buttons">
            {LOCATIONS.map((loc) => (
              <Button
                key={loc}
                variant="secondary"
                disabled={pending}
                onClick={() => onInvestigateLocation(loc)}
              >
                {LOCATION_NAMES[loc]}
              </Button>
            ))}
          </div>
        </section>

        {(round < 2 || rivalHeadlines.length === 0) && (
          <p className="choice-empty">No rival headline is open to investigation right now.</p>
        )}
        {round >= 2 && rivalHeadlines.length > 0 && (
          <section className="choice-section">
            <h3>Option B: Investigate a Rival Headline (Search for Proof of Lie)</h3>
            <div className="rival-picker">
              <select
                value={selectedRivalId}
                disabled={pending}
                onChange={(e) => setSelectedRivalId(e.target.value)}
                className="rival-select"
                aria-label="Select past rival headline"
              >
                <option value="">Select past rival headline...</option>
                {rivalHeadlines.map((h) => (
                  <option key={h.id} value={h.id}>
                    R{h.round} {h.paperName}: &ldquo;{h.text}&rdquo;
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={pending || !selectedRivalId}
                onClick={() => onInvestigateRival(selectedRivalId)}
              >
                Probe Headline
              </Button>
            </div>
          </section>
        )}

        <div className="skip-action">
          <Button variant="retro" onClick={onSkip} disabled={pending}>
            Skip Investigation
          </Button>
        </div>
      </div>
    </div>
  );
};
