/**
 * Ola 10 — Crónicas: relato de batalla + galería de fotos.
 *
 * GET    /api/cronicas                   → mis crónicas + las públicas del club (auth)
 * GET    /api/cronicas/:id               → detalle con fotos (dueño, o pública)
 * GET    /api/cronicas/batalla/:battleId → la crónica de una batalla mía, si existe
 * POST   /api/cronicas                   → crear (desde una batalla propia terminada)
 * PATCH  /api/cronicas/:id               → título, visibilidad, tono (dueño)
 * DELETE /api/cronicas/:id               → borra fila + archivos en disco (dueño)
 * POST   /api/cronicas/:id/fotos         → subir una foto (dueño, multipart)
 * DELETE /api/cronicas/:id/fotos/:fotoId → borrar una foto (dueño)
 *
 * Reglas (ver doc/arch/ADR-010-cronicas-data-model.md):
 *   - Una crónica por batalla: UNIQUE(battle_id).
 *   - La crónica puede existir sin texto; se genera aparte (POST /:id/generar).
 *   - Visibilidad la decide el autor, default privada.
 *   - El feed del club nunca expone el email del autor, solo user.name.
 */
import { Router, type Response } from 'express';
import { eq, and, or, desc, count } from 'drizzle-orm';
import multer from 'multer';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { cronicas, cronicaFotos } from '../db/schema/cronicas.js';
import { battles } from '../db/schema/battles.js';
import { user } from '../db/schema/users.js';
import { requireAuth } from '../middleware/auth.js';
import {
  saveUpload,
  deleteUpload,
  urlDeFoto,
  MAX_BYTES_FOTO,
  MAX_FOTOS_POR_CRONICA,
} from '../lib/uploads.js';
import { generarCronica, motivoSinContexto } from '../lib/story-gen.js';
import { log } from '../lib/logger.js';
import type { Cronica, CronicaFoto } from '@dobleuno/shared';
import type { CronicaRow, CronicaFotoRow } from '../db/schema/cronicas.js';

export const cronicasRouter: Router = Router();

/**
 * Multer en memoria, con límites, montado SOLO en la ruta de upload.
 *
 * Nunca global: si fuese un middleware de app, cualquier request multipart a
 * cualquier endpoint reservaría memoria. Y siempre después de requireAuth, para
 * que un anónimo no pueda hacernos tragar 8 MB de RAM por request.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_FOTO, files: 1 },
});

// ─── Schemas ──────────────────────────────────────────────────────────────

const CreateCronicaSchema = z.object({
  battleId: z.string().min(1),
  titulo: z.string().min(1).max(120).optional(),
});

const UpdateCronicaSchema = z.object({
  titulo: z.string().min(1).max(120).optional(),
  visibilidad: z.enum(['privada', 'publica']).optional(),
  tono: z.enum(['cronista', 'epico', 'sobrio']).optional(),
});

const GenerarSchema = z.object({
  tono: z.enum(['cronista', 'epico', 'sobrio']).optional(),
  /** Preferencia de estilo en texto libre. Se capa acá y otra vez en el prompt. */
  promptUsuario: z.string().max(500).nullable().optional(),
});

/** Tope de regeneraciones por crónica. */
const MAX_GENERACIONES = 5;

/** Cooldown por usuario entre generaciones, en ms. */
const COOLDOWN_MS = 30_000;

/**
 * Última generación por usuario.
 *
 * In-memory a propósito: es un freno de cortesía contra el doble click y el
 * bucle accidental, no un rate limiter serio. Se pierde al reiniciar y no se
 * comparte entre réplicas; el tope real de gasto es `generaciones` en la DB.
 */
const ultimaGeneracion = new Map<string, number>();

// ─── Serialización ────────────────────────────────────────────────────────

/** Fila de DB → shape de API. Las fechas viajan como ISO string. */
function toCronica(
  row: CronicaRow,
  extras: { autorNombre?: string | null; fotos?: CronicaFotoRow[] } = {},
): Cronica {
  return {
    id: row.id,
    battleId: row.battleId,
    userId: row.userId,
    ...(extras.autorNombre ? { autorNombre: extras.autorNombre } : {}),
    titulo: row.titulo,
    texto: row.texto,
    visibilidad: row.visibilidad,
    tono: row.tono,
    promptUsuario: row.promptUsuario,
    promptVersion: row.promptVersion,
    modelo: row.modelo,
    anclas: row.anclas,
    warnings: row.warnings,
    generaciones: row.generaciones,
    generatedAt: row.generatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(extras.fotos ? { fotos: extras.fotos.map(toFoto) } : {}),
  };
}

function toFoto(row: CronicaFotoRow): CronicaFoto {
  return {
    id: row.id,
    cronicaId: row.cronicaId,
    url: urlDeFoto(row.filename),
    mime: row.mime,
    bytes: row.bytes,
    ancho: row.ancho,
    alto: row.alto,
    epigrafe: row.epigrafe,
    orden: row.orden,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/cronicas — mis crónicas + las públicas del club.
 *
 * El listado no trae fotos (eso es el detalle) pero sí el nombre del autor,
 * para el feed. Nunca el email.
 */
cronicasRouter.get('/', requireAuth, async (req, res) => {
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
      .select({ cronica: cronicas, autorNombre: user.name })
      .from(cronicas)
      .leftJoin(user, eq(user.id, cronicas.userId))
      .where(or(eq(cronicas.userId, userId), eq(cronicas.visibilidad, 'publica')))
      .orderBy(desc(cronicas.updatedAt))
      .limit(100);

    const items = rows.map((r) => toCronica(r.cronica, { autorNombre: r.autorNombre }));
    res.json({ count: items.length, cronicas: items });
  } catch (err) {
    log.error('Cronicas list failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list cronicas' });
  }
});

/** GET /api/cronicas/batalla/:battleId — la crónica de una batalla propia. */
cronicasRouter.get('/batalla/:battleId', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const battleId = req.params.battleId as string;
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const [row] = await db
      .select()
      .from(cronicas)
      .where(and(eq(cronicas.battleId, battleId), eq(cronicas.userId, userId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'Cronica not found' });
      return;
    }
    const fotos = await fotosDe(row.id);
    res.json(toCronica(row, { fotos }));
  } catch (err) {
    log.error('Cronica by battle failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch cronica' });
  }
});

/** GET /api/cronicas/:id — detalle con fotos. Dueño siempre; ajena solo si es pública. */
cronicasRouter.get('/:id', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const cronicaId = req.params.id as string;
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const [row] = await db
      .select({ cronica: cronicas, autorNombre: user.name })
      .from(cronicas)
      .leftJoin(user, eq(user.id, cronicas.userId))
      .where(eq(cronicas.id, cronicaId))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'Cronica not found' });
      return;
    }
    const esMia = row.cronica.userId === userId;
    if (!esMia && row.cronica.visibilidad !== 'publica') {
      // 404 y no 403: que una crónica privada ajena sea indistinguible de una
      // que no existe.
      res.status(404).json({ error: 'Cronica not found' });
      return;
    }
    const fotos = await fotosDe(row.cronica.id);
    res.json(toCronica(row.cronica, { autorNombre: row.autorNombre, fotos }));
  } catch (err) {
    log.error('Cronica fetch failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch cronica' });
  }
});

/**
 * POST /api/cronicas — crear la crónica de una batalla propia y terminada.
 *
 * Nace sin texto: el relato se genera aparte. Esto permite subir fotos antes
 * de generar, que es el flujo real (las fotos se sacan en la mesa).
 */
cronicasRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const parsed = CreateCronicaSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }

    // La batalla tiene que ser mía y estar terminada.
    const [batalla] = await db
      .select({ id: battles.id, name: battles.name, status: battles.status })
      .from(battles)
      .where(and(eq(battles.id, parsed.data.battleId), eq(battles.userId, userId)))
      .limit(1);
    if (!batalla) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }
    if (batalla.status !== 'finished') {
      res.status(400).json({ error: 'Battle not finished' });
      return;
    }

    // Una crónica por batalla.
    const [existente] = await db
      .select({ id: cronicas.id })
      .from(cronicas)
      .where(eq(cronicas.battleId, batalla.id))
      .limit(1);
    if (existente) {
      res.status(409).json({ error: 'Cronica already exists', cronicaId: existente.id });
      return;
    }

    const id = crypto.randomUUID();
    const [row] = await db
      .insert(cronicas)
      .values({
        id,
        battleId: batalla.id,
        userId,
        titulo: parsed.data.titulo ?? batalla.name,
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: 'Failed to create cronica' });
      return;
    }
    log.info('Cronica created', { userId, cronicaId: id, battleId: batalla.id });
    res.status(201).json(toCronica(row));
  } catch (err) {
    log.error('Cronica create failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create cronica' });
  }
});

/** PATCH /api/cronicas/:id — título, visibilidad y tono. Solo el dueño. */
cronicasRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const cronicaId = req.params.id as string;
  const parsed = UpdateCronicaSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const propia = await cronicaPropia(cronicaId, userId, res);
    if (!propia) return;

    const [row] = await db
      .update(cronicas)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(cronicas.id, cronicaId))
      .returning();
    if (!row) {
      res.status(500).json({ error: 'Failed to update cronica' });
      return;
    }
    res.json(toCronica(row));
  } catch (err) {
    log.error('Cronica update failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to update cronica' });
  }
});

/**
 * DELETE /api/cronicas/:id — borra la fila y los archivos.
 *
 * El cascade de la DB se lleva las filas de cronica_fotos, pero no los
 * archivos: por eso los borramos a mano antes. Ver la deuda anotada en ADR-010.
 */
cronicasRouter.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const cronicaId = req.params.id as string;
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const propia = await cronicaPropia(cronicaId, userId, res);
    if (!propia) return;

    const fotos = await fotosDe(cronicaId);
    await Promise.all(fotos.map((f) => deleteUpload(f.filename)));
    await db.delete(cronicas).where(eq(cronicas.id, cronicaId));

    log.info('Cronica deleted', { userId, cronicaId, fotos: fotos.length });
    res.status(204).end();
  } catch (err) {
    log.error('Cronica delete failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete cronica' });
  }
});

/**
 * POST /api/cronicas/:id/generar — genera (o regenera) el relato.
 *
 * Frenos, en orden: batalla con material (422 sin llamar al LLM), tope de
 * generaciones (429), cooldown por usuario (429). Ver ADR-010.
 */
cronicasRouter.post('/:id/generar', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const cronicaId = req.params.id as string;
  const parsed = GenerarSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  const desdeUltima = Date.now() - (ultimaGeneracion.get(userId) ?? 0);
  if (desdeUltima < COOLDOWN_MS) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfterMs: COOLDOWN_MS - desdeUltima,
    });
    return;
  }

  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const cronica = await cronicaPropia(cronicaId, userId, res);
    if (!cronica) return;

    if (cronica.generaciones >= MAX_GENERACIONES) {
      res.status(429).json({ error: 'Generation limit reached', max: MAX_GENERACIONES });
      return;
    }

    const [batalla] = await db
      .select()
      .from(battles)
      .where(eq(battles.id, cronica.battleId))
      .limit(1);
    if (!batalla) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    // Sin material no se llama al LLM: no generamos ficción pura.
    const motivo = motivoSinContexto(batalla.data);
    if (motivo) {
      res.status(422).json({
        error: 'Not enough context',
        motivo,
        detalle:
          motivo === 'no-terminada'
            ? 'La batalla no está terminada.'
            : 'La batalla no tiene unidades ni eventos registrados.',
      });
      return;
    }

    const tono = parsed.data.tono ?? cronica.tono;
    ultimaGeneracion.set(userId, Date.now());

    const generada = await generarCronica({
      battle: batalla.data,
      tono,
      promptUsuario: parsed.data.promptUsuario ?? cronica.promptUsuario,
    });

    const [row] = await db
      .update(cronicas)
      .set({
        texto: generada.texto,
        anclas: generada.anclas,
        warnings: generada.warnings,
        modelo: generada.modelo,
        promptVersion: generada.promptVersion,
        promptUsuario: parsed.data.promptUsuario ?? cronica.promptUsuario,
        tono,
        generaciones: cronica.generaciones + 1,
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cronicas.id, cronicaId))
      .returning();
    if (!row) {
      res.status(500).json({ error: 'Failed to save cronica' });
      return;
    }

    log.info('Cronica generated', {
      userId,
      cronicaId,
      modelo: generada.modelo,
      anclas: generada.anclas.length,
      warnings: generada.warnings.length,
      chars: generada.texto.length,
    });
    res.json(toCronica(row));
  } catch (err) {
    log.error('Cronica generation failed', { userId, cronicaId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to generate cronica' });
  }
});

/**
 * POST /api/cronicas/:id/fotos — subir una foto (multipart, campo `foto`).
 *
 * Orden de la cadena: requireAuth ANTES que multer. Al revés, un anónimo puede
 * hacernos parsear 8 MB en memoria antes de que lo rechacemos.
 */
cronicasRouter.post(
  '/:id/fotos',
  requireAuth,
  upload.single('foto'),
  async (req, res) => {
    const userId = req.authUser?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const cronicaId = req.params.id as string;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Missing file', details: 'Campo esperado: foto' });
      return;
    }
    try {
      if (!(await isDbHealthy())) {
        res.status(503).json({ error: 'Database not available' });
        return;
      }
      const propia = await cronicaPropia(cronicaId, userId, res);
      if (!propia) return;

      const [{ value: yaTiene } = { value: 0 }] = await db
        .select({ value: count() })
        .from(cronicaFotos)
        .where(eq(cronicaFotos.cronicaId, cronicaId));
      if (yaTiene >= MAX_FOTOS_POR_CRONICA) {
        res.status(409).json({ error: 'Too many photos', max: MAX_FOTOS_POR_CRONICA });
        return;
      }

      // El tipo sale de los magic bytes, no del Content-Type del cliente.
      const guardada = await saveUpload(file.buffer);
      if (!guardada) {
        res.status(400).json({ error: 'Unsupported image type', details: 'JPEG, PNG o WebP' });
        return;
      }

      const id = crypto.randomUUID();
      const [row] = await db
        .insert(cronicaFotos)
        .values({
          id,
          cronicaId,
          userId,
          filename: guardada.filename,
          mime: guardada.mime,
          bytes: guardada.bytes,
          orden: yaTiene,
        })
        .returning();
      if (!row) {
        // La fila no entró: no dejamos el archivo colgado.
        await deleteUpload(guardada.filename);
        res.status(500).json({ error: 'Failed to save photo' });
        return;
      }

      await db.update(cronicas).set({ updatedAt: new Date() }).where(eq(cronicas.id, cronicaId));
      log.info('Foto uploaded', { userId, cronicaId, bytes: guardada.bytes });
      res.status(201).json(toFoto(row));
    } catch (err) {
      log.error('Foto upload failed', { userId, error: (err as Error).message });
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  },
);

/** DELETE /api/cronicas/:id/fotos/:fotoId — borra fila + archivo. */
cronicasRouter.delete('/:id/fotos/:fotoId', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const cronicaId = req.params.id as string;
  const fotoId = req.params.fotoId as string;
  try {
    if (!(await isDbHealthy())) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }
    const propia = await cronicaPropia(cronicaId, userId, res);
    if (!propia) return;

    const [foto] = await db
      .select()
      .from(cronicaFotos)
      .where(and(eq(cronicaFotos.id, fotoId), eq(cronicaFotos.cronicaId, cronicaId)))
      .limit(1);
    if (!foto) {
      res.status(404).json({ error: 'Foto not found' });
      return;
    }

    await db.delete(cronicaFotos).where(eq(cronicaFotos.id, fotoId));
    await deleteUpload(foto.filename);
    log.info('Foto deleted', { userId, cronicaId, fotoId });
    res.status(204).end();
  } catch (err) {
    log.error('Foto delete failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Fotos de una crónica, en orden. */
async function fotosDe(cronicaId: string): Promise<CronicaFotoRow[]> {
  return db
    .select()
    .from(cronicaFotos)
    .where(eq(cronicaFotos.cronicaId, cronicaId))
    .orderBy(cronicaFotos.orden);
}

/**
 * Trae la crónica si es del user. Si no existe o es de otro, responde y
 * devuelve null — el llamador solo tiene que hacer `if (!propia) return;`.
 */
async function cronicaPropia(
  cronicaId: string,
  userId: string,
  res: Response,
): Promise<CronicaRow | null> {
  const [row] = await db.select().from(cronicas).where(eq(cronicas.id, cronicaId)).limit(1);
  if (!row) {
    res.status(404).json({ error: 'Cronica not found' });
    return null;
  }
  if (row.userId !== userId) {
    res.status(403).json({ error: 'Not authorized to modify this cronica' });
    return null;
  }
  return row;
}
