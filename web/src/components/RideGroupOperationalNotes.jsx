export default function RideGroupOperationalNotes({ routeNotes = [], pickupIssues = [] }) {
  const allNotes = [...routeNotes, ...pickupIssues];

  return (
    <section className="detail-block">
      <h3>Route & Operational Notes</h3>
      {allNotes.length ? (
        <div className="note-list">
          {allNotes.map((note) => <p key={note}>{note}</p>)}
        </div>
      ) : (
        <p className="empty-copy">No route or pickup notes are attached right now.</p>
      )}
    </section>
  );
}
