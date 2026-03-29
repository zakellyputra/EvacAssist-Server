export default function EmptyState({ title, message, compact = false }) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`}>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
