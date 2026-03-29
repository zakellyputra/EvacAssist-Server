import StatusBadge from './StatusBadge';
import { getPriorityBand } from '../utils/priorityDisplay';

export default function PriorityScoreBadge({ score, showBand = true }) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return <StatusBadge value="Priority unavailable" tone="muted" />;
  }

  const band = getPriorityBand(score);
  const value = showBand ? band.shortLabel : String(score);
  return <StatusBadge value={value} tone={band.tone} />;
}
