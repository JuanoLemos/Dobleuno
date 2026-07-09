/**
 * Endpoints de Knowledge Base (KB) — unidades, reglas, items.
 * Datos parseados desde tow.whfb.app (Ola 2).
 * Búsqueda con Postgres full-text (tsvector + GIN) cuando esté disponible.
 */

import { Router } from 'express';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { units, specialRules, magicItems } from '../db/schema/kb.js';
import { log } from '../lib/logger.js';

export const rulesRouter: Router = Router();

const SearchSchema = z.object({
  q: z.string().optional(),
  faction: z.enum(['empire', 'bretonnia']).optional(),
  category: z.enum(['lord', 'hero', 'core', 'special', 'rare']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/rules/search?q=great+weapon&faction=empire
 * Busca en unidades, reglas especiales y magic items.
 */
rulesRouter.get('/search', async (req, res) => {
  const parsed = SearchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  const { q, faction, category, limit } = parsed.data;

  if (!(await isDbHealthy())) {
    res.status(503).json({
      error: 'Database not available',
      hint: 'Levantar Postgres con `npm run db:up` y migrar con `npm run db:migrate`',
    });
    return;
  }

  try {
    const results: {
      units: Array<typeof units.$inferSelect>;
      rules: Array<typeof specialRules.$inferSelect>;
      items: Array<typeof magicItems.$inferSelect>;
    } = { units: [], rules: [], items: [] };

    // Search units
    if (!category || ['lord', 'hero', 'core', 'special', 'rare'].includes(category)) {
      const unitConditions = [];
      if (q) unitConditions.push(ilike(units.name, `%${q}%`));
      if (faction) unitConditions.push(eq(units.faction, faction));
      if (category) unitConditions.push(eq(units.category, category));
      results.units = await db
        .select()
        .from(units)
        .where(unitConditions.length > 0 ? or(...unitConditions) : undefined)
        .limit(limit);
    }

    // Search special rules
    {
      const ruleConditions = [];
      if (q) ruleConditions.push(ilike(specialRules.name, `%${q}%`));
      results.rules = await db
        .select()
        .from(specialRules)
        .where(ruleConditions.length > 0 ? or(...ruleConditions) : undefined)
        .limit(limit);
    }

    // Search magic items
    {
      const itemConditions = [];
      if (q) itemConditions.push(ilike(magicItems.name, `%${q}%`));
      results.items = await db
        .select()
        .from(magicItems)
        .where(itemConditions.length > 0 ? or(...itemConditions) : undefined)
        .limit(limit);
    }

    res.json({
      query: { q, faction, category, limit },
      counts: {
        units: results.units.length,
        rules: results.rules.length,
        items: results.items.length,
        total: results.units.length + results.rules.length + results.items.length,
      },
      results,
    });
  } catch (err) {
    log.error('Search failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/units?faction=empire&category=core
 * Lista unidades con filtros básicos.
 */
const UnitsListSchema = z.object({
  faction: z.enum(['empire', 'bretonnia']).optional(),
  category: z.enum(['lord', 'hero', 'core', 'special', 'rare']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

rulesRouter.get('/units', async (req, res) => {
  const parsed = UnitsListSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }

  const conditions = [];
  if (parsed.data.faction) conditions.push(eq(units.faction, parsed.data.faction));
  if (parsed.data.category) conditions.push(eq(units.category, parsed.data.category));

  try {
    const rows = await db
      .select()
      .from(units)
      .where(conditions.length > 0 ? or(...conditions) : undefined)
      .limit(parsed.data.limit);
    res.json({ count: rows.length, units: rows });
  } catch (err) {
    log.error('Units list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list units' });
  }
});

/**
 * GET /api/units/:id
 * Trae una unidad específica por id.
 */
rulesRouter.get('/units/:id', async (req, res) => {
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const rows = await db.select().from(units).where(eq(units.id, req.params.id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    log.error('Unit fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

/**
 * GET /api/rules
 * Lista reglas especiales.
 */
rulesRouter.get('/rules', async (_req, res) => {
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const rows = await db.select().from(specialRules).limit(100);
    res.json({ count: rows.length, rules: rows });
  } catch (err) {
    log.error('Rules list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list rules' });
  }
});

/**
 * GET /api/items
 * Lista magic items.
 */
const ItemsListSchema = z.object({
  rarity: z.enum(['common', 'uncommon', 'rare', 'very-rare']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

rulesRouter.get('/items', async (req, res) => {
  const parsed = ItemsListSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const conditions = [];
    if (parsed.data.rarity) conditions.push(eq(magicItems.rarity, parsed.data.rarity));
    const rows = await db
      .select()
      .from(magicItems)
      .where(conditions.length > 0 ? or(...conditions) : undefined)
      .limit(parsed.data.limit);
    res.json({ count: rows.length, items: rows });
  } catch (err) {
    log.error('Items list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list items' });
  }
});

/**
 * GET /api/kb/stats
 * Stats de la KB: cuántas unidades, reglas, items hay.
 */
rulesRouter.get('/stats', async (_req, res) => {
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const [unitCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(units);
    const [ruleCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(specialRules);
    const [itemCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(magicItems);
    res.json({
      units: unitCount?.count ?? 0,
      rules: ruleCount?.count ?? 0,
      items: itemCount?.count ?? 0,
    });
  } catch (err) {
    log.error('KB stats failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to get KB stats' });
  }
});
