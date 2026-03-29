import StatusBadge from './StatusBadge';

export default function DriverIssueBadge({ issue }) {
  if (!issue) return null;
  const label = typeof issue === 'string' ? issue : issue.label ?? issue.title ?? issue.status;
  const tone = issue.severity === 'Critical' || issue.status === 'In Review' || issue.status === 'Open' ? 'strong' : 'muted';
  return <StatusBadge value={label} tone={tone} />;
}
