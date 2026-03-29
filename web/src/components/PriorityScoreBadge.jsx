import StatusBadge from './StatusBadge';
import { formatPriorityValue, getPriorityBand } from '../utils/priorityDisplay';

export default function PriorityScoreBadge({ score, showBand = true }) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return <StatusBadge value="Priority unavailable" tone="muted" />;
  }

  const band = getPriorityBand(score);
  const value = showBand ? `${formatPriorityValue(score)} ${band.shortLabel}` : formatPriorityValue(score);
  return <StatusBadge value={value} tone={band.tone} />;
}

