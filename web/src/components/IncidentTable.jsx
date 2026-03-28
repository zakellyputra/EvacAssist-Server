export default function IncidentTable({ incidents = [] }) {
  if (incidents.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No active incidents</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Severity</th>
          <th>Confidence</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {incidents.map((inc) => (
          <tr key={inc._id}>
            <td>{inc.event_type ?? '—'}</td>
            <td>{inc.severity != null ? inc.severity.toFixed(2) : '—'}</td>
            <td>{inc.confidence != null ? inc.confidence.toFixed(2) : '—'}</td>
            <td>{inc.source_type ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
