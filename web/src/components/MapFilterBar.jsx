export default function MapFilterBar({ filters, onChange, zones, statuses }) {
  function update(key, value) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  function toggle(key) {
    onChange((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="map-filter-bar">
      <div className="map-filter-toggles">
        {[
          ['showRideGroups', 'Ride Groups'],
          ['showDrivers', 'Drivers'],
          ['showPickupPoints', 'Pickup Points'],
          ['showRestrictedZones', 'Restricted Zones'],
          ['showConflictZones', 'Conflict Zones'],
          ['showAlerts', 'Alerts'],
        ].map(([key, label]) => (
          <label key={key} className="inline-checkbox">
            <input type="checkbox" checked={filters[key]} onChange={() => toggle(key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="map-filter-selects">
        <label className="inline-field">
          <span>Zone</span>
          <select value={filters.zone} onChange={(event) => update('zone', event.target.value)}>
            {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <label className="inline-field">
          <span>Status</span>
          <select value={filters.status} onChange={(event) => update('status', event.target.value)}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
