import cron from 'node-cron';
import conflictPublicRoutes from './routes/conflictPublicRoutes.js';
import conflictAdminRoutes from './routes/conflictAdminRoutes.js';
import refreshConflictIntel from './jobs/refreshConflictIntel.js';
import ConflictRawEvent from './models/ConflictRawEvent.js';
import ConflictEvent from './models/ConflictEvent.js';
import ConflictZone from './models/ConflictZone.js';
import RouteRiskSnapshot from './models/RouteRiskSnapshot.js';

export {
  conflictPublicRoutes,
  conflictAdminRoutes,
  refreshConflictIntel,
  ConflictRawEvent,
  ConflictEvent,
  ConflictZone,
  RouteRiskSnapshot,
};

export async function syncConflictIntelIndexes() {
  await Promise.all([
    ConflictRawEvent.syncIndexes(),
    ConflictEvent.syncIndexes(),
    ConflictZone.syncIndexes(),
    RouteRiskSnapshot.syncIndexes(),
  ]);
}

export function registerConflictIntelJob() {
  return cron.schedule('*/5 * * * *', () => {
    refreshConflictIntel()
      .then((result) => {
        if (!result.ok) {
          console.warn('[conflict-intel] Scheduled refresh skipped:', result.reason);
          return;
        }
        console.log('[conflict-intel] Scheduled refresh complete');
      })
      .catch((error) => {
        console.error('[conflict-intel] Scheduled refresh failed:', error);
      });
  });
}
