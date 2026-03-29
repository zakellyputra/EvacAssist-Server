import { Link } from 'react-router-dom';
import ActivityFeed from '../components/ActivityFeed';
import AlertsList from '../components/AlertsList';
import DashboardExceptionSummary from '../components/DashboardExceptionSummary';
import MapPanel from '../components/MapPanel';
import Panel from '../components/Panel';
import RideGroupsTable from '../components/RideGroupsTable';
import StatCard from '../components/StatCard';
import { useOperations } from '../operations';

export default function DashboardPage() {
  const {
    activity,
    dashboardAlerts,
    dashboardRideGroups,
    dashboardStats,
    driverExceptionSummary,
    liveMapData,
    liveMapSummaries,
    openAlert,
    selectedMapItem,
    selectedMapItemData,
    selectMapItem,
    openRideGroup,
  } = useOperations();

  return (
    <div className="dashboard-page">
      <section className="stats-grid">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            support={stat.support}
            context={stat.context}
          />
        ))}
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-primary-column">
          <MapPanel
            summaries={liveMapSummaries}
            data={liveMapData}
            selectedMapItem={selectedMapItemData ?? selectedMapItem}
            onSelect={selectMapItem}
            onOpenRideGroup={openRideGroup}
            onOpenAlert={openAlert}
          />

          <Panel
            title="Active Ride Groups"
            subtitle="Current ride groupings being monitored by the coordination desk, with pickup location, assigned driver, group status, and zone context."
            actions={<Link className="button button-secondary" to="/ride-groups">View all ride groups</Link>}
          >
            <RideGroupsTable groups={dashboardRideGroups} onSelectGroup={openRideGroup} />
          </Panel>
        </div>

        <div className="dashboard-side-column">
          <AlertsList
            alerts={dashboardAlerts}
            onSelectAlert={openAlert}
            actions={<Link className="button button-secondary" to="/alerts">View all alerts</Link>}
          />
          <DashboardExceptionSummary summary={driverExceptionSummary} onOpenAlert={openAlert} onOpenRideGroup={openRideGroup} />
          <ActivityFeed items={activity} />
        </div>
      </section>
    </div>
  );
}
