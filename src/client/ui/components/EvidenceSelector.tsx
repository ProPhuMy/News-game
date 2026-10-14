import React from 'react';

export interface EvidenceCard {
  id: string;
  round: number;
  location: string;
  claimType: string;
  description: string;
}

export interface EvidenceSelectorProps {
  cards: EvidenceCard[];
  selectedCardId?: string;
  onSelect: (cardId?: string) => void;
  targetLocation: string;
  claimType: string;
}

export const EvidenceSelector: React.FC<EvidenceSelectorProps> = ({
  cards,
  selectedCardId,
  onSelect,
  targetLocation,
  claimType,
}) => {
  // Only show cards matching current target and claim
  const matchingCards = cards.filter(
    (c) => c.location === targetLocation && c.claimType === claimType
  );

  if (matchingCards.length === 0) return null;

  return (
    <div className="evidence-attach-panel" aria-label="Attach Evidence">
      <h4>Attach Verified Evidence (+6 Trust)</h4>
      {matchingCards.map((card) => (
        <label key={card.id} className="evidence-card-label">
          <input
            type="checkbox"
            checked={selectedCardId === card.id}
            onChange={() => onSelect(selectedCardId === card.id ? undefined : card.id)}
          />
          <span className="card-desc">Proof: {card.description}</span>
        </label>
      ))}
    </div>
  );
};
