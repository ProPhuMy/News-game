import React, { useState } from 'react';
import type { Location, Claim, TownClaim } from '../../../shared/ids';
import { LOCATIONS, LOCATION_NAMES } from '../../../shared/ids';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { CharacterCounter } from '../components/CharacterCounter';
import type { EvidenceCard } from '../components/EvidenceSelector';
import { EvidenceSelector } from '../components/EvidenceSelector';

export interface ProofCard {
  id: string;
  targetPaperName: string;
  headlineText: string;
  location: Location;
  claimType: Claim;
}

export interface LockHeadlinePayload {
  location: Location;
  claimType: Claim;
  text: string;
  evidenceCardId?: string;
  proofCardId?: string;
}

export interface WriteScreenProps {
  hasLocked: boolean;
  evidenceCards: EvidenceCard[];
  proofCards: ProofCard[];
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
  evidenceCards,
  proofCards,
  onLockHeadline,
  onSkipWrite,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [headlineText, setHeadlineText] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const [selectedProofId, setSelectedProofId] = useState<string | undefined>();
  const [modError, setModError] = useState<string | null>(null);

  const isExposeMode = selectedClaim === 'expose';

  const handleLock = () => {
    setModError(null);
    const trimmed = headlineText.trim();
    if (!trimmed || trimmed.length > 100) return;
    if (!selectedLocation || !selectedClaim) return;

    // Local word filter simulation check
    const forbidden = ['slur', 'hate'];
    if (forbidden.some((w) => trimmed.toLowerCase().includes(w))) {
      setModError('Our lawyers won’t print that — try again.');
      return;
    }

    onLockHeadline({
      location: selectedLocation,
      claimType: selectedClaim,
      text: trimmed,
      evidenceCardId: selectedEvidenceId,
      proofCardId: selectedProofId,
    });
  };

  if (hasLocked) {
    return (
      <div className="write-screen locked" data-testid="write-locked">
        <div className="locked-card">
          <h2>The Presses are Rolling!</h2>
          <p>Your headline has been locked in for publication.</p>
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
            {proofCards.map((p) => (
              <Button
                key={p.id}
                variant={selectedProofId === p.id ? 'primary' : 'secondary'}
                onClick={() => {
                  setSelectedProofId(p.id);
                  setSelectedClaim('expose');
                  setSelectedLocation(p.location);
                  setHeadlineText(`EXPOSED: ${p.targetPaperName} lied about ${p.location}!`);
                }}
              >
                Expose {p.targetPaperName}
              </Button>
            ))}
          </div>
        )}

        {!isExposeMode && (
          <>
            <div className="editor-section">
              <label className="section-label">1. Pick Target Location</label>
              <div className="chips-row">
                {LOCATIONS.map((loc) => (
                  <Chip
                    key={loc}
                    label={LOCATION_NAMES[loc]}
                    selected={selectedLocation === loc}
                    onClick={() => setSelectedLocation(loc)}
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
                    onClick={() => setSelectedClaim(c.id)}
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
            <CharacterCounter current={headlineText.length} max={100} />
          </div>
          <textarea
            id="headline-input"
            maxLength={100}
            rows={3}
            placeholder="Write your front page headline (1–100 characters)..."
            value={headlineText}
            onChange={(e) => setHeadlineText(e.target.value)}
          />
          {modError && <div className="mod-error-banner" role="alert">{modError}</div>}
        </div>

        {selectedLocation && selectedClaim && (
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
            disabled={!selectedLocation || !selectedClaim || !headlineText.trim()}
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
