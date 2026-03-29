export default function SummaryStrip({ items }) {
  return (
    <section className="summary-strip">
      {items.map((item) => (
        <article key={item.label} className="summary-chip">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}
