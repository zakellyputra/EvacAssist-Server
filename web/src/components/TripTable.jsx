export default function TripTable({ trips = [] }) {
  if (trips.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No trips yet</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Passengers</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {trips.map((t) => (
          <tr key={t._id}>
            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {t._id?.slice(-6) ?? '—'}
            </td>
            <td>
              <span className={`badge badge-${t.status}`}>{t.status}</span>
            </td>
            <td>{t.passengers ?? '—'}</td>
            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.notes || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
