import StatusBadge from './StatusBadge';

export default function ActionStateBadge({ value }) {
  const tone = value === 'Resolved' ? 'default' : value === 'In Review' ? 'strong' : 'muted';
  return <StatusBadge value={value} tone={tone} />;
}
