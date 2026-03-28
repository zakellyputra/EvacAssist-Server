import EmptyState from './EmptyState';

export default function DetailPanel({ title, subtitle, children, isEmpty = false, emptyTitle, emptyMessage }) {
  return (
    <aside className="detail-panel">
      <div className="detail-panel-header">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {isEmpty ? (
        <EmptyState
          title={emptyTitle ?? 'No record selected'}
          message={emptyMessage ?? 'Choose an item from the list to inspect its details.'}
          compact
        />
      ) : (
        <div className="detail-panel-body">{children}</div>
      )}
    </aside>
  );
}
