import RoutePlan from './models/RoutePlan.js';
import routingRoutes from './routes/routingRoutes.js';

export { RoutePlan, routingRoutes };

export async function syncRoutingIndexes() {
  await RoutePlan.syncIndexes();
}
