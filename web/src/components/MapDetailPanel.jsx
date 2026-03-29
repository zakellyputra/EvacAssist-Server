import { Link, useNavigate } from 'react-router-dom';
import ActionStateBadge from './ActionStateBadge';
import CrossLinkActions from './CrossLinkActions';
import DepartureReadinessPanel from './DepartureReadinessPanel';
import DriverContextCard from './DriverContextCard';
import LinkedAlertsPanel from './LinkedAlertsPanel';
import RelatedEntitiesBlock from './RelatedEntitiesBlock';
import RideGroupOperationalNotes from './RideGroupOperationalNotes';
import { useOperations } from '../operations';
import StatusBadge from './StatusBadge';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function MapDetailPanel({ selected }) {
  const navigate = useNavigate();
  const {
    alertsWithRelations,
    clearMapSelection,
    focusMapOnRideGroup,
    openMapAlertDetails,
    openMapRideGroupDetails,
    requestRideGroupAction,
  } = useOperations();

  if (!selected) {
    return (
      <aside className="map-detail-panel">
        <div className="map-detail-empty">
          <strong>No map item selected</strong>
          <p>Select a ride group, driver, pickup point, restricted zone, or alert area on the map to inspect it.</p>
        </div>
      </aside>
    );
  }

  if (selected.type === 'rideGroup') {
    const rideGroup = selected.item.rideGroup;
    const linkedAlerts = alertsWithRelations.filter((alert) => rideGroup.linkedAlertIds.includes(alert.id));
    return (
      <aside className="map-detail-panel">
        <div className="map-detail-header">
          <div>
            <p className="kicker">Ride Group</p>
            <h2>{rideGroup.id}</h2>
            <p>{rideGroup.summary}</p>
          </div>
          <button type="button" className="button button-secondary" onClick={clearMapSelection}>Clear</button>
        </div>
        <div className="map-detail-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Pickup point</span><strong>{rideGroup.pickupPoint}</strong></div>
            <div className="detail-item"><span>Zone</span><strong>{rideGroup.zone}</strong></div>
            <div className="detail-item"><span>Riders / capacity</span><strong>{rideGroup.ridersJoined} / {rideGroup.capacity}</strong></div>
            <div className="detail-item"><span>Driver</span><strong>{rideGroup.driver}</strong></div>
            <div className="detail-item"><span>Status</span><StatusBadge value={rideGroup.status} tone={rideGroup.status === 'Flagged' ? 'strong' : rideGroup.status === 'Open' || rideGroup.status === 'Filling' ? 'muted' : 'default'} /></div>
            <div className="detail-item"><span>Linked alerts</span><strong>{rideGroup.linkedAlertIds.length}</strong></div>
          </div>
          <DriverContextCard driverContext={rideGroup.driverContext} assignedRideGroupId={rideGroup.id} />
          <DepartureReadinessPanel
            detail={rideGroup.departureReadinessDetail}
            riderCount={rideGroup.ridersJoined}
            capacity={rideGroup.capacity}
          />
          <LinkedAlertsPanel alerts={linkedAlerts} onOpenAlert={openMapAlertDetails} />
          <RideGroupOperationalNotes routeNotes={rideGroup.routeNotes} pickupIssues={rideGroup.pickupIssues} />
          <CrossLinkActions>
            <button type="button" className="button button-secondary" onClick={() => openMapRideGroupDetails(rideGroup.id)}>Open Full Ride Group Details</button>
            <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Mark Flagged', rideGroup.id)}>Mark Flagged</button>
            <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Close Joining', rideGroup.id)}>Close Joining</button>
            <Link className="button button-secondary" to="/ride-groups">Go to Ride Groups</Link>
          </CrossLinkActions>
        </div>
      </aside>
    );
  }

  if (selected.type === 'driver') {
    const driver = selected.item;
    return (
      <aside className="map-detail-panel">
        <div className="map-detail-header">
          <div>
            <p className="kicker">Driver Unit</p>
            <h2>{driver.unitId}</h2>
            <p>{driver.unitId} is currently {driver.status.toLowerCase()} in {driver.zone} with {driver.assignedRideGroupId} assigned.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={clearMapSelection}>Clear</button>
        </div>
        <div className="map-detail-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Assigned ride group</span><strong>{driver.assignedRideGroupId}</strong></div>
            <div className="detail-item"><span>Current status</span><strong>{driver.status}</strong></div>
            <div className="detail-item"><span>Zone</span><strong>{driver.zone}</strong></div>
            <div className="detail-item"><span>Recent update</span><strong>{formatDate(driver.lastUpdated)}</strong></div>
          </div>
          <DriverContextCard driverContext={driver.rideGroup?.driverContext ?? null} assignedRideGroupId={driver.assignedRideGroupId} />
          <CrossLinkActions>
            <button type="button" className="button button-secondary" onClick={() => openMapRideGroupDetails(driver.assignedRideGroupId)}>Open Assigned Ride Group</button>
            {driver.rideGroup?.linkedAlertIds?.[0] ? (
              <button type="button" className="button button-secondary" onClick={() => openMapAlertDetails(driver.rideGroup.linkedAlertIds[0])}>Open Related Alert</button>
            ) : null}
            <button type="button" className="button button-secondary" onClick={() => focusMapOnRideGroup(driver.assignedRideGroupId)}>
              Center on Assignment Area
            </button>
            <Link className="button button-secondary" to="/ride-groups">Review Ride Group Board</Link>
          </CrossLinkActions>
        </div>
      </aside>
    );
  }

  if (selected.type === 'pickup') {
    const pickup = selected.item;
    return (
      <aside className="map-detail-panel">
        <div className="map-detail-header">
          <div>
            <p className="kicker">Pickup Point</p>
            <h2>{pickup.name}</h2>
            <p>{pickup.name} is serving {pickup.rideGroups.length} active group{pickup.rideGroups.length === 1 ? '' : 's'} inside {pickup.zone}.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={clearMapSelection}>Clear</button>
        </div>
        <div className="map-detail-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Zone</span><strong>{pickup.zone}</strong></div>
            <div className="detail-item"><span>Active groups nearby</span><strong>{pickup.rideGroups.map((group) => group.id).join(', ') || 'None'}</strong></div>
          </div>
          <div className="detail-block">
            <h3>Current demand note</h3>
            <p className="detail-copy">{pickup.demandNote}</p>
          </div>
          <CrossLinkActions>
            {pickup.rideGroups[0] ? (
              <button type="button" className="button button-secondary" onClick={() => openMapRideGroupDetails(pickup.rideGroups[0].id)}>
                Open Primary Nearby Ride Group
              </button>
            ) : null}
            <Link className="button button-secondary" to="/ride-groups">Open Ride Groups</Link>
          </CrossLinkActions>
        </div>
      </aside>
    );
  }

  if (selected.type === 'zone') {
    const zone = selected.item;
    return (
      <aside className="map-detail-panel">
        <div className="map-detail-header">
          <div>
            <p className="kicker">Restricted Zone</p>
            <h2>{zone.name}</h2>
            <p>{zone.restrictionType} is affecting {zone.rideGroups.length} nearby group{zone.rideGroups.length === 1 ? '' : 's'} in {zone.zone}.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={clearMapSelection}>Clear</button>
        </div>
        <div className="map-detail-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Restriction type</span><strong>{zone.restrictionType}</strong></div>
            <div className="detail-item"><span>Affected groups</span><strong>{zone.rideGroups.map((group) => group.id).join(', ') || 'None'}</strong></div>
            <div className="detail-item detail-item-wide"><span>Nearby drivers</span><strong>{zone.rideGroups.map((group) => group.driverUnitId).filter(Boolean).join(', ') || 'No assigned units'}</strong></div>
          </div>
          <div className="detail-block">
            <h3>Suggested caution note</h3>
            <p className="detail-copy">{zone.cautionNote}</p>
          </div>
          <LinkedAlertsPanel alerts={zone.alerts} onOpenAlert={openMapAlertDetails} />
          <CrossLinkActions>
            <Link className="button button-secondary" to="/alerts">Open Alerts Queue</Link>
          </CrossLinkActions>
        </div>
      </aside>
    );
  }

  if (selected.type === 'alertArea') {
    const alertArea = selected.item;
    const alert = alertArea.alert;
    return (
      <aside className="map-detail-panel">
        <div className="map-detail-header">
          <div>
            <p className="kicker">Active Alert Area</p>
            <h2>{alert.title}</h2>
            <p>{alert.description}</p>
          </div>
          <button type="button" className="button button-secondary" onClick={clearMapSelection}>Clear</button>
        </div>
        <div className="map-detail-body">
          <div className="detail-grid">
            <div className="detail-item"><span>Affected zone</span><strong>{alert.relatedZone}</strong></div>
            <div className="detail-item"><span>Related ride group</span><strong>{alert.relatedGroupId ?? 'None'}</strong></div>
            <div className="detail-item"><span>Severity</span><StatusBadge value={alert.severity} tone={alert.severityTone} /></div>
            <div className="detail-item"><span>State</span><ActionStateBadge value={alert.status} /></div>
          </div>
          <RelatedEntitiesBlock
            rideGroupId={alert.relatedGroupId}
            zone={alert.relatedZone}
            assignedDriver={alert.assignedDriver}
            pickupPoint={alert.pickupPoint}
          />
          <DriverContextCard driverContext={alert.driverContext} assignedRideGroupId={alert.relatedGroupId} />
          <div className="detail-block">
            <h3>Recommended action</h3>
            <p className="detail-copy">{alert.suggestedAction}</p>
          </div>
          <CrossLinkActions>
            <button type="button" className="button button-secondary" onClick={() => openMapAlertDetails(alert.id)}>Open Related Alert</button>
            {alert.relatedGroupId ? (
              <button type="button" className="button button-secondary" onClick={() => openMapRideGroupDetails(alert.relatedGroupId)}>Open Related Ride Group</button>
            ) : null}
            <button type="button" className="button button-secondary" onClick={() => navigate('/alerts')}>Go to Alerts</button>
          </CrossLinkActions>
        </div>
      </aside>
    );
  }

  return null;
}
