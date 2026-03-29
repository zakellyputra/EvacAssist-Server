import Panel from './Panel';

export default function ActivityFeed({ items }) {
  return (
    <Panel
      title="Recent Activity"
      subtitle="A live-style event feed showing movement, group updates, alert generation, and field check-ins across the evacuation board."
    >
      <div className="activity-feed">
        {items.map((item) => (
          <article key={item.id} className="activity-item">
            <div className="activity-item-time">{item.time}</div>
            <div className="activity-item-copy">
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              {item.meta ? <span className="activity-item-meta">{item.meta}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
