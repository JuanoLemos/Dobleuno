/**
 * Ola 7.1 — Endpoints admin para sync de KB.
 *
 * POST /api/admin/kb/sync       → arranca sync en background, devuelve 202 + jobId
 * GET  /api/admin/kb/status     → estado del job actual/último + últimos logs
 *
 * Ambos requieren: sesión válida + is_admin=true.
 */
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { runSync, getSyncStatus, getRecentSyncLogs } from '../lib/kb-sync.js';

export const adminKbRouter: Router = Router();

// POST /api/admin/kb/sync
adminKbRouter.post('/sync', requireAuth, requireAdmin, (req, res) => {
  const forcedBy = req.authUser?.email ?? 'unknown';
  const { jobId, alreadyRunning } = runSync({ forcedBy });
  res.status(202).json({
    jobId,
    alreadyRunning,
    message: alreadyRunning
      ? 'Sync ya estaba corriendo; usá el jobId existente.'
      : 'Sync iniciado en background. Polling GET /api/admin/kb/status para ver progreso.',
  });
});

// GET /api/admin/kb/status
adminKbRouter.get('/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const job = getSyncStatus();
    const recentLogs = await getRecentSyncLogs(10);
    res.json({
      currentJob: job,
      recentLogs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read status', message: (err as Error).message });
  }
});
