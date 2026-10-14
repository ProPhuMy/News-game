import React from 'react';
import type { Color } from '../../../shared/ids';

export type PaperColor = Color | 'grey';

export const PAPER_ICONS: Record<PaperColor, { label: string; symbol: string }> = {
  red: { label: 'Quill icon', symbol: '🪶' },
  blue: { label: 'Megaphone icon', symbol: '📢' },
  green: { label: 'Eye icon', symbol: '👁️' },
  gold: { label: 'Lightning bolt icon', symbol: '⚡' },
  grey: { label: 'Neutral icon', symbol: '📰' },
};

interface PaperBadgeProps {
  paperName: string;
  color: PaperColor;
  className?: string;
}

export const PaperBadge: React.FC<PaperBadgeProps> = ({ paperName, color, className = '' }) => {
  const icon = PAPER_ICONS[color] || PAPER_ICONS.grey;

  return (
    <span className={`paper-badge paper-color-${color} ${className}`}>
      <span className="paper-icon" aria-label={icon.label}>
        {icon.symbol}
      </span>
      <span className="paper-name">{paperName}</span>
    </span>
  );
};
