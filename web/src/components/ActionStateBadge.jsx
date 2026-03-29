import StatusBadge from './StatusBadge';

export default function ActionStateBadge({ value }) {
  const tone = (
    value === 'Resolved' || value === 'READY'
      ? 'default'
      : value === 'In Review' || value === 'FLAGGED' || value === 'BLOCKED'
        ? 'strong'
        : 'muted'
  );
  return <StatusBadge value={value} tone={tone} />;
}
