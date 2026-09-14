/**
 * Ola 8 — Club info (info pública del club, editable por admin).
 *
 * GET    /api/club            → lee la fila única (seed default si no existe)
 * PUT    /api/club            → actualiza la fila única (requiere admin)
 *
 * GET es público (la app muestra el banner del club a todos, logueados o no).
 * PUT requiere sesión válida + is_admin=true (requireAdmin).
 *
 * En MVP single-tenant: un deploy = un club (id=1 siempre).
 */
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { clubInfo } from '../db/schema/club.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { log } from '../lib/logger.js';

export const clubRouter: Router = Router();

// ─── Seed ─────────────────────────────────────────────────────────────────
// Si la tabla está vacía, sembramos con un placeholder "Dobleuno".
// Eso permite que la app muestre info aunque el admin no haya editado nada.

const SEED: Omit<typeof clubInfo.$inferInsert, 'id' | 'createdAt' | 'updatedAt'> = {
  nombre: 'Dobleuno',
  descripcion:
    'Club de Warhammer: The Old World. Software libre, no comercial, hecho por y para los clubes.',
  direccion: null,
  horarios: 'Sábados 14–22hs',
  contactoEmail: null,
  contactoWhatsapp: null,
  discord: null,
  redes: {},
  updatedBy: null,
};

async function getOrSeedClub(): Promise<typeof clubInfo.$inferSelect> {
  const [existing] = await db.select().from(clubInfo).where(eq(clubInfo.id, 1)).limit(1);
  if (existing) return existing;
  const [seeded] = await db.insert(clubInfo).values({ id: 1, ...SEED }).returning();
  if (!seeded) throw new Error('Failed to seed club_info');
  log.info('Seeded club_info with default placeholder');
  return seeded;
}

// ─── Schemas ──────────────────────────────────────────────────────────────

const UpdateClubSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().max(500).nullable().optional(),
  direccion: z.string().max(200).nullable().optional(),
  horarios: z.string().max(300).nullable().optional(),
  contactoEmail: z.string().email().max(200).nullable().optional(),
  contactoWhatsapp: z.string().max(30).nullable().optional(),
  discord: z.string().max(200).nullable().optional(),
  redes: z.record(z.string(), z.string().url()).optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────

/** GET /api/club — info pública del club. Seed default si la fila no existe. */
clubRouter.get('/', async (_req, res) => {
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const row = await getOrSeedClub();
    res.json(row);
  } catch (err) {
    log.error('Club info fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch club info' });
  }
});

/** PUT /api/club — actualiza la fila única. Requiere admin. */
clubRouter.put('/', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = UpdateClubSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    // Aseguramos que la fila existe antes de update (idempotente).
    await getOrSeedClub();
    const [row] = await db
      .update(clubInfo)
      .set({
        ...parsed.data,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(clubInfo.id, 1))
      .returning();
    if (!row) {
      res.status(500).json({ error: 'Failed to update club info' });
      return;
    }
    log.info('Club info updated', { userId });
    res.json(row);
  } catch (err) {
    log.error('Club info update failed', {
      userId,
      error: (err as Error).message,
    });
    res.status(500).json({ error: 'Failed to update club info' });
  }
});