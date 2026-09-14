/**
 * Ola 9 — Mesas del club (CRUD admin + GET público).
 *
 * GET    /api/mesas           → mesas activas (público)
 * POST   /api/mesas           → crear mesa (admin)
 * PUT    /api/mesas/:id       → editar nombre/capacidad (admin)
 * DELETE /api/mesas/:id       → soft delete (activa=false) (admin)
 *
 * En MVP single-tenant: las mesas son del club, no por user.
 * GET es público para que cualquiera pueda ver qué mesas hay antes de loguearse.
 */
import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { mesas } from '../db/schema/mesas.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { log } from '../lib/logger.js';

export const mesasRouter: Router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────

const CreateMesaSchema = z.object({
  nombre: z.string().min(1).max(80),
  capacidad: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]),
});

const UpdateMesaSchema = z.object({
  nombre: z.string().min(1).max(80).optional(),
  capacidad: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]).optional(),
  activa: z.boolean().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────

/** GET /api/mesas — mesas activas (público, sin auth). */
mesasRouter.get('/', async (_req, res) => {
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const rows = await db
      .select()
      .from(mesas)
      .where(eq(mesas.activa, true))
      .orderBy(desc(mesas.createdAt));
    res.json({ count: rows.length, mesas: rows });
  } catch (err) {
    log.error('Mesas fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch mesas' });
  }
});

/** POST /api/mesas — crear mesa (admin). */
mesasRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = CreateMesaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(mesas)
      .values({
        id,
        nombre: parsed.data.nombre,
        capacidad: parsed.data.capacidad,
        activa: true,
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: 'Failed to create mesa' });
      return;
    }
    log.info('Mesa created', { userId, mesaId: id });
    res.status(201).json(row);
  } catch (err) {
    log.error('Mesa create failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create mesa' });
  }
});

/** PUT /api/mesas/:id — editar mesa (admin). */
mesasRouter.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.authUser?.id;
  const id = req.params.id as string;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const parsed = UpdateMesaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const [row] = await db
      .update(mesas)
      .set(parsed.data)
      .where(eq(mesas.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: 'Mesa not found' });
      return;
    }
    log.info('Mesa updated', { userId, mesaId: id });
    res.json(row);
  } catch (err) {
    log.error('Mesa update failed', { userId, mesaId: id, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to update mesa' });
  }
});

/** DELETE /api/mesas/:id — soft delete (admin). */
mesasRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.authUser?.id;
  const id = req.params.id as string;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    // Soft delete siempre en MVP. Las sesiones existentes no se tocan (la FK cascade
    // no se activa porque la mesa sigue existiendo, solo está inactiva).
    const [row] = await db
      .update(mesas)
      .set({ activa: false })
      .where(eq(mesas.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: 'Mesa not found' });
      return;
    }
    log.info('Mesa soft-deleted', { userId, mesaId: id });
    res.json({ ok: true, mesa: row });
  } catch (err) {
    log.error('Mesa delete failed', { userId, mesaId: id, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete mesa' });
  }
});