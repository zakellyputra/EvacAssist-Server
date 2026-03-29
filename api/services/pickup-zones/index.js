import PickupZone from './models/PickupZone.js';
import pickupZoneRoutes from './routes/pickupZoneRoutes.js';

export { PickupZone, pickupZoneRoutes };

export async function syncPickupZoneIndexes() {
  await PickupZone.syncIndexes();
}
