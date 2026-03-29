import AlertDetailDrawer from './AlertDetailDrawer';
import ConfirmationDialog from './ConfirmationDialog';
import RideGroupDetailDrawer from './RideGroupDetailDrawer';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useOperations } from '../operations';

export default function AppShell({ children }) {
  const { selectedRideGroup, selectedAlert, confirmation, closeDetails, closeConfirmation } = useOperations();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell-main">
        <TopHeader />
        <main className="app-shell-content">{children}</main>
      </div>
      {selectedRideGroup ? <RideGroupDetailDrawer rideGroup={selectedRideGroup} open={Boolean(selectedRideGroup)} onClose={closeDetails} /> : null}
      {selectedAlert ? <AlertDetailDrawer alert={selectedAlert} onClose={closeDetails} /> : null}
      {confirmation ? <ConfirmationDialog {...confirmation} onCancel={closeConfirmation} /> : null}
    </div>
  );
}
