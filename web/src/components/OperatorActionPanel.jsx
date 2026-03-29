import { useMemo, useState } from 'react';
import { useOperations } from '../operations';

export default function OperatorActionPanel({ rideGroup }) {
  const {
    availableDriverOptions,
    availableVehicleOptions,
    assignRideGroupDriver,
    assignRideGroupVehicle,
    completeRideGroupReadinessCheck,
    escalateRideGroupAlerts,
    markRideGroupDispatchReady,
    requestRideGroupAction,
    resolveRideGroupAlerts,
    reviewRideGroupBlockers,
  } = useOperations();

  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');

  const unresolvedAlerts = useMemo(
    () => (rideGroup.linkedAlerts ?? []).filter((alert) => alert.status !== 'Resolved'),
    [rideGroup.linkedAlerts],
  );
  const driverOptions = useMemo(
    () => availableDriverOptions.filter((driver) => driver.isAvailable || driver.userId === rideGroup.driverAssignment?.userId),
    [availableDriverOptions, rideGroup.driverAssignment?.userId],
  );
  const vehicleOptions = useMemo(
    () => availableVehicleOptions.filter((vehicle) => vehicle.isAvailable || vehicle._id === rideGroup.schemaRefs?.vehicleId),
    [availableVehicleOptions, rideGroup.schemaRefs?.vehicleId],
  );

  const hasDriver = Boolean(rideGroup.driverAssignment?.assigned);
  const hasVehicle = Boolean(rideGroup.schemaRefs?.vehicleId);
  const isBlocked = rideGroup.readinessState === 'BLOCKED' || rideGroup.actionState === 'BLOCKED';
  const hasCriticalUnresolvedAlert = unresolvedAlerts.some((alert) => alert.severity === 'Critical');
  const canDispatchReady = hasDriver && hasVehicle && !hasCriticalUnresolvedAlert && !isBlocked;
  const shouldReassignDriver = hasDriver && (rideGroup.flagged || isBlocked || rideGroup.driverAssignment?.status?.toLowerCase().includes('delayed'));

  function clearError() {
    setActionError('');
  }

  function handleDispatchReady() {
    clearError();
    const result = markRideGroupDispatchReady(rideGroup.id, note);
    if (!result?.ok) setActionError(result?.error ?? 'Dispatch-ready transition is not available.');
  }

  return (
    <section className="detail-block">
      <h3>Operator Actions</h3>

      <label className="field">
        <span>Operator note</span>
        <textarea
          className="operator-note-input"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for assignment, escalation, or shift handoff context"
        />
      </label>

      {!hasDriver ? (
        <div className="operator-action-row">
          <label className="inline-field">
            <span>Assign Driver</span>
            <select value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)}>
              <option value="">Select available driver</option>
              {driverOptions.map((driver) => (
                <option key={driver.userId} value={driver.userId}>
                  {driver.displayName ?? driver.userId} · {driver.unitId ?? 'No unit'} · {driver.operationalState ?? driver.status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-secondary" onClick={() => assignRideGroupDriver(rideGroup.id, selectedDriverId, note)} disabled={!selectedDriverId}>
            Assign Driver
          </button>
        </div>
      ) : null}

      {shouldReassignDriver ? (
        <div className="operator-action-row">
          <label className="inline-field">
            <span>Reassign Driver</span>
            <select value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)}>
              <option value="">Select replacement driver</option>
              {driverOptions.map((driver) => (
                <option key={driver.userId} value={driver.userId}>
                  {driver.displayName ?? driver.userId} · {driver.unitId ?? 'No unit'} · {driver.operationalState ?? driver.status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-secondary" onClick={() => assignRideGroupDriver(rideGroup.id, selectedDriverId, note)} disabled={!selectedDriverId}>
            Reassign Driver
          </button>
        </div>
      ) : null}

      {!hasVehicle ? (
        <div className="operator-action-row">
          <label className="inline-field">
            <span>Assign Vehicle</span>
            <select value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)}>
              <option value="">Select available vehicle</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.label} · {vehicle.type} · {vehicle.seatCapacity} seats
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-secondary" onClick={() => assignRideGroupVehicle(rideGroup.id, selectedVehicleId, note)} disabled={!selectedVehicleId}>
            Assign Vehicle
          </button>
        </div>
      ) : null}

      {unresolvedAlerts.length ? (
        <div className="map-detail-actions">
          <button type="button" className="button button-secondary" onClick={() => resolveRideGroupAlerts(rideGroup.id, note)}>
            Resolve Alert
          </button>
          <button type="button" className="button button-secondary" onClick={() => escalateRideGroupAlerts(rideGroup.id, note)}>
            Escalate Alert
          </button>
        </div>
      ) : null}

      {isBlocked ? (
        <div className="map-detail-actions">
          <button type="button" className="button button-secondary" onClick={() => reviewRideGroupBlockers(rideGroup.id, note)}>
            Review Blockers
          </button>
          <button type="button" className="button button-secondary" onClick={() => completeRideGroupReadinessCheck(rideGroup.id, note)}>
            Mark Readiness Check Complete
          </button>
        </div>
      ) : null}

      <div className="map-detail-actions">
        {canDispatchReady ? (
          <button type="button" className="button button-primary" onClick={handleDispatchReady}>
            Mark Dispatch Ready
          </button>
        ) : null}
        {!['Full', 'Completed', 'Cancelled'].includes(rideGroup.status) ? (
          <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Close Joining', rideGroup.id)}>
            Close Joining
          </button>
        ) : null}
        {rideGroup.status === 'Full' ? (
          <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Reopen Group', rideGroup.id)}>
            Reopen Group
          </button>
        ) : null}
        <button type="button" className="button button-secondary" onClick={() => requestRideGroupAction('Cancel Group', rideGroup.id)}>
          Cancel Group
        </button>
      </div>

      {actionError ? <div className="message-block message-block-error">{actionError}</div> : null}
      {!driverOptions.length && !hasDriver ? <p className="empty-copy">No driver is currently available for assignment.</p> : null}
      {!vehicleOptions.length && !hasVehicle ? <p className="empty-copy">No vehicle is currently available for assignment.</p> : null}
    </section>
  );
}

