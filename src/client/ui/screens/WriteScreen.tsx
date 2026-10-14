import React, { useState } from 'react';
import type { Location, Claim, TownClaim } from '../../../shared/ids.ts';
import { LOCATIONS, LOCATION_NAMES } from '../../../shared/ids.ts';
import { TUNING } from '../../../shared/tuning.ts';
import type { Story } from '../../../shared/protocol.ts';
import { Button } from '../components/Button.tsx';
import { Chip } from '../components/Chip.tsx';
import { CharacterCounter } from '../components/CharacterCounter.tsx';
import type { EvidenceCard } from '../components/EvidenceSelector.tsx';
import { EvidenceSelector } from '../components/EvidenceSelector.tsx';

export interface ProofCard {
  id: string;
  targetPaperName: string;
  headlineText: string;
  location: Location;
  claimType: Claim;
}

export interface LockHeadlinePayload {
  story: Story;
  text: string;
}

export interface WriteScreenProps {
  hasLocked: boolean;
  lockedHeadline?: { id: string; story: Story; text: string } | null;
  evidenceCards: EvidenceCard[];
  proofCards: ProofCard[];
  serverError?: string | null;
  onLockHeadline: (payload: LockHeadlinePayload) => void;
  onSkipWrite: () => void;
}

const CLAIM_OPTIONS: { id: TownClaim; label: string }[] = [
  { id: 'danger', label: 'Danger' },
  { id: 'health_scare', label: 'Health Scare' },
  { id: 'scandal', label: 'Scandal' },
  { id: 'great_deal', label: 'Great Deal' },
  { id: 'weird_sighting', label: 'Weird Sighting' },
  { id: 'all_clear', label: 'All Clear' },
];

export const WriteScreen: React.FC<WriteScreenProps> = ({
  hasLocked,
  lockedHeadline,
  evidenceCards,
  proofCards,
  serverError,
  onLockHeadline,
  onSkipWrite,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [headlineText, setHeadlineText] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const [selectedProofId, setSelectedProofId] = useState<string | undefined>();

  const isExposeMode = selectedClaim === 'expose';

  const handleLocationChange = (loc: Location) => {
    setSelectedLocation(loc);
    setSelectedEvidenceId(undefined);
  };

  const handleClaimChange = (claim: Claim) => {
    setSelectedClaim(claim);
    setSelectedEvidenceId(undefined);
  };

  const handleCancelExpose = () => {
    setSelectedClaim(null);
    setSelectedProofId(undefined);
    setHeadlineText('');
    setSelectedEvidenceId(undefined);
  };

  const handleLock = () => {
    const trimmed = headlineText.trim();
    if (!trimmed || trimmed.length > TUNING.limits.headlineChars) return;

    if (isExposeMode) {
      if (!selectedProofId) return;
      onLockHeadline({
        story: {
          kind: 'expose',
          headlineId: selectedProofId,
        },
        text: trimmed,
      });
      return;
    }

    if (!selectedLocation || !selectedClaim) return;
    onLockHeadline({
      story: {
        kind: 'claim',
        location: selectedLocation,
        claim: selectedClaim as TownClaim,
        attachEvidence: selectedEvidenceId !== undefined,
      },
      text: trimmed,
    });
  };

  if (hasLocked) {
    return (
      <div className="write-screen locked" data-testid="write-locked">
        <div className="locked-card">
          <h2>The Presses are Rolling!</h2>
          <p>Your headline has been locked in for publication.</p>
          {lockedHeadline && (
            <blockquote className="locked-headline-preview" data-testid="locked-headline-preview">
              &ldquo;{lockedHeadline.text}&rdquo;
            </blockquote>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="write-screen" data-testid="write-screen">
      <div className="editor-card">
        <h2>Front Page Editor</h2>

        {proofCards.length > 0 && (
          <div className="proof-exposure-banner">
            <h3>Hold Evidence of Rival Lies!</h3>
            <div className="proof-buttons-row">
              {proofCards.map((p) => {
                const isSelected = selectedProofId === p.id;
                return (
                  <Button
                    key={p.id}
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => {
                      if (isSelected) {
                        handleCancelExpose();
                      } else {
                        setSelectedProofId(p.id);
                        setSelectedClaim('expose');
                        setSelectedLocation(p.location);
                        setSelectedEvidenceId(undefined);
                        const locName = LOCATION_NAMES[p.location] ?? p.location;
                        setHeadlineText(`EXPOSED: ${p.targetPaperName} lied about ${locName}!`);
                      }
                    }}
                  >
                    Expose {p.targetPaperName}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {isExposeMode ? (
          <div className="expose-mode-header">
            <span className="expose-badge">Exposing Rival Story</span>
            <Button variant="secondary" onClick={handleCancelExpose}>
              Cancel Expose
            </Button>
          </div>
        ) : (
          <>
            <div className="editor-section">
              <label className="section-label">1. Pick Target Location</label>
              <div className="chips-row">
                {LOCATIONS.map((loc) => (
                  <Chip
                    key={loc}
                    label={LOCATION_NAMES[loc]}
                    selected={selectedLocation === loc}
                    onClick={() => handleLocationChange(loc)}
                  />
                ))}
              </div>
            </div>

            <div className="editor-section">
              <label className="section-label">2. Pick Claim Angle</label>
              <div className="chips-row">
                {CLAIM_OPTIONS.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    selected={selectedClaim === c.id}
                    onClick={() => handleClaimChange(c.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="editor-section">
          <div className="textarea-header">
            <label htmlFor="headline-input" className="section-label">
              3. Headline Text
            </label>
            <CharacterCounter current={headlineText.length} max={TUNING.limits.headlineChars} />
          </div>
          <textarea
            id="headline-input"
            maxLength={TUNING.limits.headlineChars}
            rows={3}
            placeholder={`Write your front page headline (1–${TUNING.limits.headlineChars} characters)...`}
            value={headlineText}
            onChange={(e) => setHeadlineText(e.target.value)}
          />
          {serverError && (
            <div className="mod-error-banner" role="alert">
              {serverError}
            </div>
          )}
        </div>

        {!isExposeMode && selectedLocation && selectedClaim && (
          <EvidenceSelector
            cards={evidenceCards}
            selectedCardId={selectedEvidenceId}
            onSelect={setSelectedEvidenceId}
            targetLocation={selectedLocation}
            claimType={selectedClaim}
          />
        )}

        <div className="editor-actions">
          <Button
            variant="primary"
            disabled={
              isExposeMode
                ? !selectedProofId || !headlineText.trim()
                : !selectedLocation || !selectedClaim || !headlineText.trim()
            }
            onClick={handleLock}
            className="btn-large"
          >
            LOCK IT IN
          </Button>
          <Button variant="retro" onClick={onSkipWrite}>
            Skip Writing
          </Button>
        </div>
      </div>
    </div>
  );
};
