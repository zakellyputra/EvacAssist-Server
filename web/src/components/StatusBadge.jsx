import { getStatusConfig } from '../utils/statusMaps';

export default function StatusBadge({ category, value }) {
  const config = getStatusConfig(category, value);

  return (
    <span className={`status-badge tone-${config.tone}`}>
      {config.label}
    </span>
  );
}
