import { Link } from 'react-router-dom';
import MapCanvas from './MapCanvas';
import MapLegend from './MapLegend';
import Panel from './Panel';
import PriorityScoreBadge from './PriorityScoreBadge';
import StatusBadge from './StatusBadge';
import { formatConflictCount } from '../utils/conflictDisplay';

function buildSelectionSummary(selectedMapItem) {
  if (!selectedMapItem) {
    return {
      title: 'No map selection',
      description: 'Select a ride group, driver, pickup point, restricted zone, or alert area to inspect the live operational picture.',
      actionLabel: null,
    };
  }

  if (selectedMapItem.type === 'rideGroup') {
    const rideGroup = selectedMapItem.item?.rideGroup ?? null;
    if (!rideGroup) {
      return {
        title: 'Ride group unavailable',
        description: 'The selected ride marker no longer has an active operational record attached.',
        actionLabel: null,
      };
    }

    return {
      title: rideGroup.id,
      description: `${rideGroup.pickupPoint} · ${rideGroup.zone} · ${formatConflictCount(rideGroup.activeConflictCount)}`,
      actionLabel: 'Open ride details',
      rideGroup,
    };
  }

  if (selectedMapItem.type === 'alertArea') {
    const alert = selectedMapItem.item?.alert ?? null;
    return {
      title: alert?.title ?? 'Alert area',
      description: alert?.relatedRideGroup
        ? `${alert.relatedRideGroup.id} · ${formatConflictCount(alert.relatedRideGroup.activeConflictCount)}`
        : 'No linked ride group',
      actionLabel: alert ? 'Open alert details' : null,
      alert,
    };
  }

  if (selectedMapItem.type === 'driver') {
    const driver = selectedMapItem.item ?? null;
    return {
      title: driver?.unitId ?? 'Driver unit',
      description: driver?.assignedRideGroupId
        ? `Assigned to ${driver.assignedRideGroupId} in ${driver.zone}`
        : `No active ride assignment in ${driver?.zone ?? 'unknown zone'}`,
      actionLabel: driver?.assignedRideGroupId ? 'Open assigned ride' : null,
      driver,
    };
  }

  if (selectedMapItem.type === 'pickup') {
    const pickup = selectedMapItem.item ?? null;
    return {
      title: pickup?.name ?? 'Pickup point',
      description: pickup?.demandNote ?? 'Pickup demand details unavailable.',
      actionLabel: pickup?.rideGroups?.[0] ? 'Open nearby ride' : null,
      pickup,
    };
  }

  if (selectedMapItem.type === 'zone') {
    const zone = selectedMapItem.item ?? null;
    return {
      title: zone?.name ?? 'Restricted zone',
      description: zone?.cautionNote ?? 'Zone caution details unavailable.',
      actionLabel: null,
    };
  }

  if (selectedMapItem.type === 'conflictZone') {
    const zone = selectedMapItem.item ?? null;
    return {
      title: zone?.zoneId ?? 'Conflict zone',
      description: zone
        ? `${zone.riskLabel} risk · score ${zone.score} · ${zone.recommendedAction.replace(/_/g, ' ')}`
        : 'Conflict zone details unavailable.',
      actionLabel: null,
    };
  }

  return {
    title: 'Map selection',
    description: 'Selected map item details unavailable.',
    actionLabel: null,
  };
}

export default function MapPanel({
  summaries,
  data,
  selectedMapItem,
  onSelect,
  onOpenRideGroup,
  onOpenAlert,
}) {
  const selection = buildSelectionSummary(selectedMapItem);

  function handleOpenSelection() {
    if (selection.rideGroup) {
      onOpenRideGroup?.(selection.rideGroup.id);
      return;
    }
    if (selection.alert) {
      onOpenAlert?.(selection.alert.id);
      return;
    }
    if (selection.driver?.assignedRideGroupId) {
      onOpenRideGroup?.(selection.driver.assignedRideGroupId);
      return;
    }
    if (selection.pickup?.rideGroups?.[0]?.id) {
      onOpenRideGroup?.(selection.pickup.rideGroups[0].id);
    }
  }

  return (
    <Panel
      title="Live Operations Map"
      subtitle="Monitor active ride groups, pickup points, field units, and alert corridors on the real operational map instead of a static preview."
      actions={<Link className="button button-secondary button-inline" to="/live-map">Open Live Map</Link>}
      className="map-panel"
    >
      <div className="map-panel-meta">
        {(Array.isArray(summaries) ? summaries : []).map((item) => (
          <div key={item.label} className="map-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="map-preview-shell">
        <MapCanvas data={data} selectedMapItem={selectedMapItem} onSelect={onSelect} />
      </div>

      <section className="detail-block map-preview-summary">
        <div>
          <h3>{selection.title}</h3>
          <p className="detail-copy">{selection.description}</p>
        </div>

        {selection.rideGroup ? (
          <div className="linked-entity-meta">
            <PriorityScoreBadge score={selection.rideGroup.priorityScore} />
            <StatusBadge value={selection.rideGroup.readinessState ?? 'PENDING'} tone={selection.rideGroup.readinessState === 'BLOCKED' ? 'strong' : 'default'} />
            {selection.rideGroup.hasBlockingConflicts ? <StatusBadge value="Blocking conflict" tone="strong" /> : null}
          </div>
        ) : null}

        {selection.alert ? (
          <div className="linked-entity-meta">
            <StatusBadge value={selection.alert.severity} tone={selection.alert.severityTone} />
            {selection.alert.relatedRideGroup ? <PriorityScoreBadge score={selection.alert.relatedRideGroup.priorityScore} /> : null}
          </div>
        ) : null}

        <div className="panel-actions">
          {selection.actionLabel ? (
            <button type="button" className="button button-secondary button-inline" onClick={handleOpenSelection}>
              {selection.actionLabel}
            </button>
          ) : null}
          <Link className="button button-secondary button-inline" to="/live-map">
            Open full map
          </Link>
        </div>
      </section>

      <MapLegend />
    </Panel>
  );
}
