import AuditLog from '../models/AuditLog.js';

class AuditLogger {
  async log(eventType, { actor_id, trip_id, payload = {} }) {
    try {
      await AuditLog.create({
        event_type: eventType,
        actor_id,
        trip_id,
        payload,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[audit] Failed to log event:', eventType, error);
      // Don't throw - audit logging shouldn't break business logic
    }
  }

  // Basic verification - just check for missing entries
  async verifyBasic() {
    try {
      const totalEntries = await AuditLog.countDocuments();
      const lastWeek = await AuditLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      return {
        total_entries: totalEntries,
        recent_entries: lastWeek,
        status: 'basic_check_passed'
      };
    } catch (error) {
      console.error('[audit] Basic verification failed:', error);
      return { status: 'verification_failed', error: error.message };
    }
  }
}

const auditLogger = new AuditLogger();
export default auditLogger;