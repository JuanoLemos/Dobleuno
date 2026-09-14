/**
 * CRUD de listas (army lists).
 *
 * GET    /api/lists                 — lista del user actual
 * POST   /api/lists                 — crea una lista
 * GET    /api/lists/:id             — trae una lista
 * PATCH  /api/lists/:id             — actualiza (nombre, units, points)
 * DELETE /api/lists/:id             — borra
 *
 * Auth real desde Ola 10: todas las rutas exigen sesión (better-auth vía
 * cookie) y filtran por `req.authUser.id`. Antes usaban un
 * `userId = 'dev-user-1'` hardcodeado, así que cada usuario veía
 * las listas de todos los demás.
 */
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { lists } from '../db/schema/lists.js';
import { requireAuth } from '../middleware/auth.js';
import { log } from '../lib/logger.js';
import { validateList } from '../lib/list-validator.js';
import type { List } from '@dobleuno/shared';

export const listsRouter: Router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────

const FactionEnum = z.enum(['empire', 'bretonnia']);

const ListUnitSchema = z.object({
  id: z.string(),
  ref: z.string(),
  name: z.string(),
  category: z.enum(['lord', 'hero', 'core', 'special', 'rare']),
  points: z.number().int().nonnegative(),
  models: z.number().int().positive().optional(),
  commandGroup: z
    .object({
      champion: z.boolean().optional(),
      standard: z.boolean().optional(),
      musician: z.boolean().optional(),
    })
    .optional(),
  options: z
    .array(
      z.object({
        name: z.string(),
        points: z.number().int().nonnegative(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  magicItems: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const ListSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  faction: FactionEnum,
  totalPoints: z.number().int().nonnegative().default(0),
  units: z.array(ListUnitSchema).default([]),
});

const CreateListSchema = ListSchema.omit({ id: true }).extend({
  id: z.string().optional(),
});

const UpdateListSchema = ListSchema.partial();

// ─── Routes ──────────────────────────────────────────────────────────────

/** GET /api/lists — lista del user actual */
listsRouter.get('/', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(lists)
      .where(eq(lists.userId, userId))
      .orderBy(desc(lists.updatedAt));
    res.json({ count: rows.length, lists: rows });
  } catch (err) {
    log.error('Lists fetch failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

/** POST /api/lists — crea una lista */
listsRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  const parsed = CreateListSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  const id = parsed.data.id ?? crypto.randomUUID();
  const list: List = { ...parsed.data, id, userId: userId } as List;
  // Server-side validation
  const validation = validateList(list);
  try {
    const [row] = await db
      .insert(lists)
      .values({
        id: list.id,
        userId: userId,
        name: list.name,
        faction: list.faction,
        totalPoints: list.totalPoints,
        data: list,
      })
      .returning();
    res.status(201).json({ list: row, validation });
  } catch (err) {
    log.error('List create failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create list' });
  }
});

/** GET /api/lists/:id */
listsRouter.get('/:id', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  const listId = req.params.id as string;
  try {
    const [row] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    log.error('List fetch failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

/** PATCH /api/lists/:id */
listsRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  const listId = req.params.id as string;
  const parsed = UpdateListSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  const updates = parsed.data;
  try {
    const [current] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    const merged: List = {
      ...(current.data),
      ...updates,
      id: current.id,
      userId: current.userId,
      faction: updates.faction ?? (current.data).faction,
      totalPoints: updates.totalPoints ?? (current.data).totalPoints,
      units: updates.units ?? (current.data).units,
    };
    const validation = validateList(merged);
    const [row] = await db
      .update(lists)
      .set({
        name: merged.name,
        faction: merged.faction,
        totalPoints: merged.totalPoints,
        data: merged,
        updatedAt: new Date(),
      })
      .where(eq(lists.id, listId))
      .returning();
    res.json({ list: row, validation });
  } catch (err) {
    log.error('List update failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to update list' });
  }
});

/** DELETE /api/lists/:id */
listsRouter.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  const listId = req.params.id as string;
  try {
    await db
      .delete(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    res.status(204).end();
  } catch (err) {
    log.error('List delete failed', { userId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete list' });
  }
});
