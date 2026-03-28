import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  rows,
  keyField = '_id',
  emptyTitle = 'Nothing to show',
  emptyMessage = 'Data will appear here when records are available.',
  onRowClick,
  selectedRowId,
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} compact />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowId = row[keyField];
            const isSelected = selectedRowId != null && rowId === selectedRowId;

            return (
              <tr
                key={rowId}
                className={onRowClick ? 'is-clickable' : ''}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
