export default function StatCard({ label, value, support, context }) {
  return (
    <section className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        {context ? <span className="stat-context">{context}</span> : null}
      </div>
      <strong className="stat-value">{value}</strong>
      {support ? <p className="stat-support">{support}</p> : null}
    </section>
  );
}
