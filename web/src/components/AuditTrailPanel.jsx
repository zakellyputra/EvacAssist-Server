function formatDate(value) {
  if (!value) return 'Unavailable';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function AuditTrailPanel({ entries = [] }) {
  return (
    <section className="detail-block">
      <h3>Audit Trail</h3>
      {entries.length ? (
        <div className="note-list">
          {entries.map((entry) => (
            <p key={entry.id}>
              <strong>{formatDate(entry.timestamp)}</strong>
              {' '}
              {entry.description}
              {' '}
              <span className="inline-meta">by {entry.actor}</span>
              {entry.note ? ` Note: ${entry.note}` : ''}
            </p>
          ))}
        </div>
      ) : (
        <p className="empty-copy">No operator audit entries have been recorded for this ride group yet.</p>
      )}
    </section>
  );
}

