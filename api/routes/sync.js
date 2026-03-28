import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import SyncQueue from '../models/SyncQueue.js';

const router = Router();

// POST /api/sync/push — upload queued offline operations
router.post('/push', requireAuth, async (req, res) => {
  const { operations } = req.body; // array of { collection, operation, document, queued_at }
  if (!Array.isArray(operations)) return res.status(400).json({ error: 'operations array required' });

  const results = [];
  for (const op of operations) {
    // TODO: apply last-write-wins per document using updated_at comparison
    results.push({ queued_at: op.queued_at, status: 'queued' });
  }
  res.json({ synced: results.length });
});

// GET /api/sync/pull?since=<ISO timestamp> — fetch changes since last sync
router.get('/pull', requireAuth, async (req, res) => {
  const since = req.query.since ? new Date(req.query.since) : new Date(0);
  // TODO: return all documents updated since `since` across relevant collections
  res.json({ since: since.toISOString(), changes: [] });
});

export default router;
