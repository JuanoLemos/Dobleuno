/**
 * Ola 9 — Reservas de jugadores para sesiones.
 *
 * GET    /api/sesiones/:id/reservas       → lista de anotados (público, sin emails)
 * POST   /api/sesiones/:id/reservar       → reservar plaza (auth)
 * DELETE /api/sesiones/:id/reservar/:rid  → cancelar reserva (dueño o admin)
 * GET    /api/mis-reservas                → mis sesiones futuras con reserva (auth)
 *
 * Reglas:
 *   - Anti-doble-booking: UNIQUE(sesion_id, user_id) en DB.
 *   - Capacidad: si la mesa está llena, 409 Conflict.
 *   - listId opcional, debe ser del user autenticado.
 *   - Dueño puede borrar la suya; admin puede borrar cualquiera.
 */
import { Router } from 'express';
import { eq, and, gte, asc, count } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { mesas, sesiones, reservas } from '../db/schema/mesas.js';
import { lists } from '../db/schema/lists.js';
import { user } from '../db/schema/users.js';
import { requireAuth } from '../middleware/auth.js';
import { log } from '../lib/logger.js';

export const reservasRouter: Router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────

const CreateReservaSchema = z.object({
  /** FK opcional a una lista del armybuilder del user. */
  listId: z.string().min(1).nullable().optional(),
  /** Notas del jugador (ej: "Llego 10 min tarde"). */
  notas: z.string().max(300).nullable().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/sesiones/:id/reservas — jugadores anotados (público).
 * Devuelve solo datos públicos: userId (no email), listId, notas, createdAt.
 */
reservasRouter.get('/sesiones/:id/reservas', async (req, res) => {
  const sesionId = req.params.id;
  if (!sesionId) {
    res.status(400).json({ error: 'Missing sesion id' });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    // Verificar que la sesión existe.
    const [sesion] = await db
      .select({ id: sesiones.id })
      .from(sesiones)
      .where(eq(sesiones.id, sesionId))
      .limit(1);
    if (!sesion) {
      res.status(404).json({ error: 'Sesion not found' });
      return;
    }

    const rows = await db
      .select({
        id: reservas.id,
        userId: reservas.userId,
        userName: user.name,
        listId: reservas.listId,
        notas: reservas.notas,
        createdAt: reservas.createdAt,
      })
      .from(reservas)
      .leftJoin(user, eq(user.id, reservas.userId))
      .where(eq(reservas.sesionId, sesionId))
      .orderBy(asc(reservas.createdAt));

    res.json({ count: rows.length, reservas: rows });
  } catch (err) {
    log.error('Reservas fetch failed', { sesionId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch reservas' });
  }
});

/**
 * POST /api/sesiones/:id/reservar — reservar plaza (auth required).
 *
 * Valida:
 *   - Sesión existe y es futura.
 *   - Mesa está activa.
 *   - User no tiene ya reserva (constraint UNIQUE).
 *   - Mesa no está llena.
 *   - listId, si viene, pertenece al user.
 */
reservasRouter.post(
  '/sesiones/:id/reservar',
  requireAuth,
  async (req, res) => {
    const userId = req.authUser?.id;
    const sesionId = req.params.id as string;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!sesionId) {
      res.status(400).json({ error: 'Missing sesion id' });
      return;
    }

    const parsed = CreateReservaSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
      return;
    }

    try {
      if (!(await isDbHealthy())) {
        res.status(503).json({ error: 'Database not available' });
        return;
      }

      // 1. Sesión existe y es futura.
      const [sesion] = await db
        .select({
          id: sesiones.id,
          mesaId: sesiones.mesaId,
          fecha: sesiones.fecha,
        })
        .from(sesiones)
        .where(eq(sesiones.id, sesionId))
        .limit(1);
      if (!sesion) {
        res.status(404).json({ error: 'Sesion not found' });
        return;
      }
      if (sesion.fecha < new Date()) {
        res.status(400).json({ error: 'Cannot reserve past session' });
        return;
      }

      // 2. Mesa existe, está activa, y trae capacidad.
      const [mesa] = await db
        .select({ id: mesas.id, capacidad: mesas.capacidad, activa: mesas.activa })
        .from(mesas)
        .where(eq(mesas.id, sesion.mesaId))
        .limit(1);
      if (!mesa) {
        res.status(400).json({ error: 'Mesa not found' });
        return;
      }
      if (!mesa.activa) {
        res.status(400).json({ error: 'Mesa is inactive' });
        return;
      }

      // 3. Contar reservas existentes y comparar con capacidad.
      const reservasCount = await db
        .select({ total: count() })
        .from(reservas)
        .where(eq(reservas.sesionId, sesionId));
      const total = reservasCount[0]?.total ?? 0;
      if (total >= mesa.capacidad) {
        res.status(409).json({ error: 'Session is full' });
        return;
      }

      // 4. Validar listId si viene: debe ser del user.
      if (parsed.data.listId) {
        const [ownList] = await db
          .select({ id: lists.id })
          .from(lists)
          .where(and(eq(lists.id, parsed.data.listId), eq(lists.userId, userId)))
          .limit(1);
        if (!ownList) {
          res.status(400).json({ error: 'List not found or not owned by user' });
          return;
        }
      }

      // 5. Insertar. Si el user ya tiene reserva (race condition), UNIQUE constraint
      // va a tirar error → caemos al catch y devolvemos 409.
      const id = crypto.randomUUID();
      try {
        const [row] = await db
          .insert(reservas)
          .values({
            id,
            sesionId,
            userId,
            listId: parsed.data.listId ?? null,
            notas: parsed.data.notas ?? null,
          })
          .returning();
        if (!row) {
          res.status(500).json({ error: 'Failed to create reserva' });
          return;
        }
        log.info('Reserva created', { userId, sesionId, reservaId: id });
        res.status(201).json(row);
      } catch (insertErr) {
        const err = insertErr as Error & { code?: string };
        if (err.code === '23505') {
          // UNIQUE violation → ya tiene reserva.
          res.status(409).json({ error: 'User already has a reserva for this session' });
          return;
        }
        throw insertErr;
      }
    } catch (err) {
      log.error('Reserva create failed', { userId, sesionId, error: (err as Error).message });
      res.status(500).json({ error: 'Failed to create reserva' });
    }
  },
);

/**
 * DELETE /api/sesiones/:id/reservar/:reservaId — cancelar reserva.
 * Dueño o admin pueden borrar.
 */
reservasRouter.delete(
  '/sesiones/:id/reservar/:reservaId',
  requireAuth,
  async (req, res) => {
    const userId = req.authUser?.id;
    const isAdmin = req.authUser?.isAdmin ?? false;
    const sesionId = req.params.id as string;
    const reservaId = req.params.reservaId as string;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!sesionId || !reservaId) {
      res.status(400).json({ error: 'Missing ids' });
      return;
    }

    try {
      if (!(await isDbHealthy())) {
        res.status(503).json({ error: 'Database not available' });
        return;
      }
      // Verificar ownership o admin.
      const [existing] = await db
        .select({ id: reservas.id, userId: reservas.userId })
        .from(reservas)
        .where(and(eq(reservas.id, reservaId), eq(reservas.sesionId, sesionId)))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: 'Reserva not found' });
        return;
      }
      if (existing.userId !== userId && !isAdmin) {
        res.status(403).json({ error: 'Not authorized to cancel this reserva' });
        return;
      }

      await db
        .delete(reservas)
        .where(eq(reservas.id, reservaId));
      log.info('Reserva cancelled', { userId, reservaId, isAdmin });
      res.status(204).end();
    } catch (err) {
      log.error('Reserva delete failed', { userId, reservaId, error: (err as Error).message });
      res.status(500).json({ error: 'Failed to cancel reserva' });
    }
  },
);

/**
 * GET /api/mis-reservas — mis sesiones futuras donde tengo reserva (auth).
 * Devuelve la sesión con info de la mesa y la reserva misma.
 */
reservasRouter.get('/mis-reservas', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const rows = await db
      .select({
        reserva: {
          id: reservas.id,
          listId: reservas.listId,
          notas: reservas.notas,
          createdAt: reservas.createdAt,
        },
        sesion: sesiones,
        mesa: {
          id: mesas.id,
          nombre: mesas.nombre,
          capacidad: mesas.capacidad,
        },
      })
      .from(reservas)
      .innerJoin(sesiones, eq(sesiones.id, reservas.sesionId))
      .innerJoin(mesas, eq(mesas.id, sesiones.mesaId))
      .where(and(eq(reservas.userId, userId), gte(sesiones.fecha, new Date())))
      .orderBy(asc(sesiones.fecha));

    res.json({ count: rows.length, reservas: rows });
  } catch (err) {
    log.error('Mis-reservas fetch failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch mis-reservas' });
  }
});