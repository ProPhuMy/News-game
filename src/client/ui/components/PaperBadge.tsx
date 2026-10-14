import type { Color } from '../../../shared/ids.ts';
import { COLOR_ICONS } from '../../../shared/ids.ts';

export type PaperColor = Color | 'grey';

const ICON_SYMBOLS = {
  quill: { label: 'Quill icon', symbol: '🪶' },
  megaphone: { label: 'Megaphone icon', symbol: '📢' },
  eye: { label: 'Eye icon', symbol: '👁️' },
  lightning: { label: 'Lightning bolt icon', symbol: '⚡' },
} as const;

export const PAPER_ICONS: Record<PaperColor, { label: string; symbol: string }> = {
  red: ICON_SYMBOLS[COLOR_ICONS.red],
  blue: ICON_SYMBOLS[COLOR_ICONS.blue],
  green: ICON_SYMBOLS[COLOR_ICONS.green],
  gold: ICON_SYMBOLS[COLOR_ICONS.gold],
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
