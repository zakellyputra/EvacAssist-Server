import StatusBadge from './StatusBadge';

export default function DriverIssueBadge({ issue }) {
  if (!issue) return null;
  return <StatusBadge value={issue} tone="strong" />;
}
