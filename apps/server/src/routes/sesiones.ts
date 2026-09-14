/**
 * Ola 9 — Sesiones de juego (CRUD admin + GET público).
 *
 * GET    /api/sesiones                  → sesiones futuras (público, filtros opcionales)
 * GET    /api/sesiones?includePast=true → incluye pasadas (admin/debug)
 * GET    /api/sesiones/:id              → una sesión específica (público)
 * POST   /api/sesiones                  → publicar sesión (admin)
 * PUT    /api/sesiones/:id              → editar (admin)
 * DELETE /api/sesiones/:id              → borrar (cascade reservas) (admin)
 *
 * Las reservas (POST/DELETE) viven en routes/reservas.ts (Día 2).
 *
 * En MVP single-tenant: sesiones del club, no por user.
 * GET es público (anima a registrarse para reservar).
 */
import { Router } from 'express';
import { eq, and, gte, asc } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { mesas, sesiones } from '../db/schema/mesas.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { log } from '../lib/logger.js';

export const sesionesRouter: Router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────

const FormatoEnum = z.enum(['2000', '2500', 'open']);

const CreateSesionSchema = z.object({
  mesaId: z.string().min(1),
  /** ISO 8601 con offset (ej: "2026-07-15T17:00:00-03:00"). */
  fecha: z.string().datetime({ offset: true }),
  formato: FormatoEnum,
  notas: z.string().max(500).nullable().optional(),
});

const UpdateSesionSchema = z.object({
  mesaId: z.string().min(1).optional(),
  fecha: z.string().datetime({ offset: true }).optional(),
  formato: FormatoEnum.optional(),
  notas: z.string().max(500).nullable().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseFecha(input: string): Date {
  // ISO 8601 con offset → Postgres lo guarda correctamente como timestamptz.
  return new Date(input);
}

// ─── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/sesiones — sesiones futuras del club (público).
 *
 * Query params:
 *   mesaId        → filtrar por mesa específica
 *   includePast   → "true" para incluir sesiones pasadas (uso admin)
 */
sesionesRouter.get('/', async (req, res) => {
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }

    const mesaId = typeof req.query.mesaId === 'string' ? req.query.mesaId : undefined;
    const includePast = req.query.includePast === 'true' || req.query.includePast === '1';

    // Construimos filtros uno a uno (Drizzle exige tipos consistentes).
    const filters = [];
    if (mesaId) filters.push(eq(sesiones.mesaId, mesaId));
    if (!includePast) filters.push(gte(sesiones.fecha, new Date()));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(sesiones)
      .where(where)
      .orderBy(asc(sesiones.fecha));

    res.json({ count: rows.length, sesiones: rows });
  } catch (err) {
    log.error('Sesiones fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch sesiones' });
  }
});

/** GET /api/sesiones/:id — una sesión específica (público). */
sesionesRouter.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const [row] = await db
      .select()
      .from(sesiones)
      .where(eq(sesiones.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'Sesion not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    log.error('Sesion fetch failed', { sesionId: id, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch sesion' });
  }
});

/** POST /api/sesiones — publicar sesión (admin). */
sesionesRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = CreateSesionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    // Validar que la mesa existe y está activa.
    const [mesa] = await db
      .select()
      .from(mesas)
      .where(eq(mesas.id, parsed.data.mesaId))
      .limit(1);
    if (!mesa) {
      res.status(400).json({ error: 'Mesa not found' });
      return;
    }
    if (!mesa.activa) {
      res.status(400).json({ error: 'Mesa is inactive' });
      return;
    }

    const id = crypto.randomUUID();
    const fecha = parseFecha(parsed.data.fecha);
    const [row] = await db
      .insert(sesiones)
      .values({
        id,
        mesaId: parsed.data.mesaId,
        fecha,
        formato: parsed.data.formato,
        notas: parsed.data.notas ?? null,
        adminUserId: userId,
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: 'Failed to create sesion' });
      return;
    }
    log.info('Sesion created', { userId, sesionId: id, mesaId: parsed.data.mesaId });
    res.status(201).json(row);
  } catch (err) {
    log.error('Sesion create failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create sesion' });
  }
});

/** PUT /api/sesiones/:id — editar sesión (admin). */
sesionesRouter.put('/:id', requireAuth, requireAdmin, async (req, res) => {
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

  const parsed = UpdateSesionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    // Si cambia mesaId, validar que existe.
    if (parsed.data.mesaId) {
      const [mesa] = await db
        .select()
        .from(mesas)
        .where(eq(mesas.id, parsed.data.mesaId))
        .limit(1);
      if (!mesa) {
        res.status(400).json({ error: 'Mesa not found' });
        return;
      }
    }

    const updates: {
      mesaId?: string;
      fecha?: Date;
      formato?: '2000' | '2500' | 'open';
      notas?: string | null;
      updatedAt?: Date;
    } = {};
    if (parsed.data.mesaId !== undefined) updates.mesaId = parsed.data.mesaId;
    if (parsed.data.fecha !== undefined) updates.fecha = parseFecha(parsed.data.fecha);
    if (parsed.data.formato !== undefined) updates.formato = parsed.data.formato;
    if (parsed.data.notas !== undefined) updates.notas = parsed.data.notas;
    updates.updatedAt = new Date();

    const [row] = await db
      .update(sesiones)
      .set(updates)
      .where(eq(sesiones.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: 'Sesion not found' });
      return;
    }
    log.info('Sesion updated', { userId, sesionId: id });
    res.json(row);
  } catch (err) {
    log.error('Sesion update failed', { userId, sesionId: id, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to update sesion' });
  }
});

/** DELETE /api/sesiones/:id — borrar sesión + cascade reservas (admin). */
sesionesRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
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
    const [row] = await db
      .delete(sesiones)
      .where(eq(sesiones.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: 'Sesion not found' });
      return;
    }
    log.info('Sesion deleted', { userId, sesionId: id });
    res.status(204).end();
  } catch (err) {
    log.error('Sesion delete failed', { userId, sesionId: id, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete sesion' });
  }
});