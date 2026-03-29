import StatusBadge from './StatusBadge';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function getStatusTone(status) {
  if (status === 'Flagged') return 'strong';
  if (status === 'Open' || status === 'Filling') return 'muted';
  return 'default';
}

export default function RideGroupsTable({ groups, onSelectGroup, showExtendedColumns = false }) {
  const safeGroups = Array.isArray(groups) ? groups : [];

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Group ID</th>
            <th>Pickup Point</th>
            {showExtendedColumns ? <th>Zone</th> : null}
            <th>Riders</th>
            {showExtendedColumns ? <th>Capacity</th> : null}
            <th>Driver</th>
            <th>Status</th>
            {showExtendedColumns ? <th>Intervention State</th> : <th>Zone</th>}
            {showExtendedColumns ? <th>Last Updated</th> : null}
            {showExtendedColumns ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {safeGroups.map((group) => (
            <tr
              key={group.id}
              className={onSelectGroup ? 'is-clickable' : ''}
              onClick={onSelectGroup ? () => onSelectGroup(group.id) : undefined}
            >
              <td>
                <div className="table-primary">
                  <strong>{group.id}</strong>
                  <span>{group.corridor}</span>
                </div>
              </td>
              <td>
                <div className="table-primary">
                  <strong>{group.pickupPoint}</strong>
                  <span>{group.pickupDetail}</span>
                </div>
              </td>
              {showExtendedColumns ? <td>{group.zone}</td> : null}
              <td>{group.ridersJoined}</td>
              {showExtendedColumns ? <td>{group.capacity}</td> : null}
              <td>
                <div className="table-primary">
                  <strong>{group.driver}</strong>
                  <span>{group.vehicle}</span>
                </div>
              </td>
              <td>
                <StatusBadge value={group.status} tone={getStatusTone(group.status)} />
              </td>
              {showExtendedColumns ? (
                <td>
                  <StatusBadge
                    value={group.interventionState}
                    tone={group.interventionState === 'Needs Review' ? 'strong' : group.interventionState === 'None' ? 'default' : 'muted'}
                  />
                </td>
              ) : (
                <td>{group.zone}</td>
              )}
              {showExtendedColumns ? <td>{formatDate(group.updatedAt)}</td> : null}
              {showExtendedColumns ? (
                <td>
                {showExtendedColumns ? (
                  <button
                    type="button"
                    className="button button-secondary button-inline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectGroup?.(group.id);
                    }}
                  >
                    View Details
                  </button>
                ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
