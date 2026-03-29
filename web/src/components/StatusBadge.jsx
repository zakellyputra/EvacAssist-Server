export default function StatusBadge({ value, tone = 'default' }) {
  return <span className={`status-badge status-badge-${tone}`}>{value}</span>;
}
