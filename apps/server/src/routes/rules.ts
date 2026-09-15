/**
 * API del Codex — reglas especiales, items mágicos y unidades.
 *
 * El corpus completo de tow.whfb.app vive en Postgres desde la Ola 11: 1796
 * reglas, 751 items, 577 unidades. A ese tamaño la lista entera no viaja en
 * una respuesta, así que todo lista con paginado y filtro server-side.
 *
 * ── Rutas ────────────────────────────────────────────────────────────────
 *   GET /api/rules            ?q= &section= &page= &limit=
 *   GET /api/rules/sections   facetas con conteo, para la navegación
 *   GET /api/rules/:slug
 *   GET /api/items            ?q= &type= &family= &page= &limit=
 *   GET /api/items/types
 *   GET /api/items/:slug
 *   GET /api/units            ?q= &army= &category= &page= &limit=
 *   GET /api/units/:id
 *   GET /api/kb/search        búsqueda combinada
 *   GET /api/kb/stats
 *
 * ── Por qué cambiaron los paths ──────────────────────────────────────────
 *
 * El router se monta en `/api` (app.ts), pero declaraba `/search` y `/stats`.
 * O sea que los endpoints reales eran `/api/search` y `/api/stats`, mientras
 * el cliente llamaba a `/api/rules/search` y `/api/kb/stats`: 404 desde la Ola
 * 2, sin un solo test que tocara estas rutas. Ahora los prefijos están
 * escritos completos acá, que es donde se leen.
 */

import { Router, type Response } from 'express';
import { and, arrayContains, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { db, isDbHealthy } from '../db/client.js';
import { units, specialRules, magicItems } from '../db/schema/kb.js';
import { log } from '../lib/logger.js';

export const rulesRouter: Router = Router();

/** Sin base no hay Codex: 503 explícito en vez de una lista vacía. */
async function exigirDb(res: Response): Promise<boolean> {
  if (await isDbHealthy()) return true;
  res.status(503).json({
    error: 'Database not available',
    hint: 'Levantar Postgres con `npm run db:up` y migrar con `npm run db:migrate`',
  });
  return false;
}

const PaginaSchema = z.object({
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const ReglasSchema = PaginaSchema.extend({
  /** Sección del reglamento, tal como la publica el sitio. */
  section: z.string().max(60).optional(),
});

const ItemsSchema = PaginaSchema.extend({
  type: z.string().max(60).optional(),
  /**
   * Lista de items en la que la entrada está disponible
   * ('empire-of-man-magic-items-type', 'forest-spites-type', …). Es distinta
   * de `type` ('Ability', 'Arcane Item', …): el tipo dice qué es el item, la
   * lista dice en qué ejército se puede usar.
   */
  family: z.string().max(60).optional(),
});

const UnidadesSchema = PaginaSchema.extend({
  army: z.string().max(60).optional(),
  category: z.string().max(60).optional(),
});

/**
 * Filtro de texto libre.
 *
 * `search_text` es `name + cuerpo` en minúsculas, escrito por el seed. Se busca
 * ahí y no en `name` para que "flanco" encuentre la regla que lo menciona, no
 * solo la que se llama así. ILIKE alcanza a esta escala; si deja de alcanzar,
 * el índice GIN ya está previsto en el schema.
 */
function filtroTexto(columna: AnyPgColumn, q?: string): SQL | undefined {
  const termino = q?.trim();
  return termino ? ilike(columna, `%${termino.toLowerCase()}%`) : undefined;
}

/**
 * Orden por relevancia cuando hay término de búsqueda.
 *
 * `search_text` incluye el cuerpo, así que "great weapon" matchea también a
 * "Braystaff", que la menciona. Ordenado alfabéticamente, Braystaff quedaba
 * arriba de Great Weapon: en un reglamento que se consulta en la mesa, eso es
 * lo contrario de lo que se necesita.
 *
 * El orden es: nombre exacto, nombre que empieza con el término, nombre que lo
 * contiene, y el resto (matchea solo por el cuerpo). Dentro de cada grupo,
 * alfabético.
 */
function ordenar(columna: AnyPgColumn, q?: string): SQL[] {
  const termino = q?.trim().toLowerCase();
  if (!termino) return [asc(columna)];
  return [
    sql`case
      when lower(${columna}) = ${termino} then 0
      when lower(${columna}) like ${termino + '%'} then 1
      when lower(${columna}) like ${'%' + termino + '%'} then 2
      else 3
    end`,
    asc(columna),
  ];
}

function combinar(condiciones: Array<SQL | undefined>): SQL | undefined {
  const activas = condiciones.filter((c): c is SQL => c !== undefined);
  if (activas.length === 0) return undefined;
  return activas.length === 1 ? activas[0] : and(...activas);
}

// ─── Reglas ───────────────────────────────────────────────────────────────

// Va antes de /rules/:slug, o "sections" se lee como un slug.
rulesRouter.get('/rules/sections', async (_req, res) => {
  if (!(await exigirDb(res))) return;
  try {
    const filas = await db
      .select({ section: specialRules.ruleType, count: sql<number>`count(*)::int` })
      .from(specialRules)
      .groupBy(specialRules.ruleType)
      .orderBy(asc(specialRules.ruleType));
    res.json({ sections: filas.filter((f) => f.section) });
  } catch (err) {
    log.error('Rule sections failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list sections' });
  }
});

rulesRouter.get('/rules', async (req, res) => {
  const parsed = ReglasSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await exigirDb(res))) return;

  const { q, section, page, limit } = parsed.data;
  const where = combinar([
    filtroTexto(specialRules.searchText, q),
    section ? eq(specialRules.ruleType, section) : undefined,
  ]);

  try {
    const [total] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(specialRules)
      .where(where);
    const filas = await db
      .select()
      .from(specialRules)
      .where(where)
      .orderBy(...ordenar(specialRules.name, q))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ total: total?.n ?? 0, page, limit, rules: filas });
  } catch (err) {
    log.error('Rules list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list rules' });
  }
});

rulesRouter.get('/rules/:slug', async (req, res) => {
  if (!(await exigirDb(res))) return;
  try {
    const filas = await db
      .select()
      .from(specialRules)
      .where(or(eq(specialRules.slug, req.params.slug), eq(specialRules.id, req.params.slug)))
      .limit(1);
    if (filas.length === 0) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    res.json(filas[0]);
  } catch (err) {
    log.error('Rule fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// ─── Items mágicos ────────────────────────────────────────────────────────

rulesRouter.get('/items/types', async (_req, res) => {
  if (!(await exigirDb(res))) return;
  try {
    const filas = await db
      .select({ type: magicItems.type, count: sql<number>`count(*)::int` })
      .from(magicItems)
      .groupBy(magicItems.type)
      .orderBy(asc(magicItems.type));
    res.json({ types: filas.filter((f) => f.type) });
  } catch (err) {
    log.error('Item types failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list types' });
  }
});

rulesRouter.get('/items', async (req, res) => {
  const parsed = ItemsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await exigirDb(res))) return;

  const { q, type, family, page, limit } = parsed.data;
  const where = combinar([
    filtroTexto(magicItems.searchText, q),
    type ? eq(magicItems.type, type) : undefined,
    family ? arrayContains(magicItems.itemTypes, [family]) : undefined,
  ]);

  try {
    const [total] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(magicItems)
      .where(where);
    const filas = await db
      .select()
      .from(magicItems)
      .where(where)
      .orderBy(...ordenar(magicItems.name, q))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ total: total?.n ?? 0, page, limit, items: filas });
  } catch (err) {
    log.error('Items list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list items' });
  }
});

rulesRouter.get('/items/:slug', async (req, res) => {
  if (!(await exigirDb(res))) return;
  try {
    const filas = await db
      .select()
      .from(magicItems)
      .where(or(eq(magicItems.slug, req.params.slug), eq(magicItems.id, req.params.slug)))
      .limit(1);
    if (filas.length === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(filas[0]);
  } catch (err) {
    log.error('Item fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// ─── Unidades ─────────────────────────────────────────────────────────────

rulesRouter.get('/units', async (req, res) => {
  const parsed = UnidadesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await exigirDb(res))) return;

  const { q, army, category, page, limit } = parsed.data;
  const where = combinar([
    filtroTexto(units.searchText, q),
    army ? eq(units.army, army) : undefined,
    category ? eq(units.unitCategory, category) : undefined,
  ]);

  try {
    const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(units).where(where);
    const filas = await db
      .select()
      .from(units)
      .where(where)
      .orderBy(...ordenar(units.name, q))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ total: total?.n ?? 0, page, limit, count: filas.length, units: filas });
  } catch (err) {
    log.error('Units list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list units' });
  }
});

rulesRouter.get('/units/:id', async (req, res) => {
  if (!(await exigirDb(res))) return;
  try {
    const filas = await db
      .select()
      .from(units)
      .where(or(eq(units.id, req.params.id), eq(units.slug, req.params.id)))
      .limit(1);
    if (filas.length === 0) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }
    res.json(filas[0]);
  } catch (err) {
    log.error('Unit fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

// ─── Búsqueda combinada ───────────────────────────────────────────────────

const BusquedaSchema = z.object({
  q: z.string().max(120).optional(),
  army: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * GET /api/kb/search?q=great+weapon
 * Una pasada por las tres tablas: devuelve pocos resultados de cada tipo, para
 * un resumen. Las listas completas son /api/rules, /api/items y /api/units.
 */
rulesRouter.get('/kb/search', async (req, res) => {
  const parsed = BusquedaSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await exigirDb(res))) return;

  const { q, army, limit } = parsed.data;

  try {
    const [unidades, reglas, items] = await Promise.all([
      db
        .select()
        .from(units)
        .where(combinar([filtroTexto(units.searchText, q), army ? eq(units.army, army) : undefined]))
        .orderBy(...ordenar(units.name, q))
        .limit(limit),
      db
        .select()
        .from(specialRules)
        .where(filtroTexto(specialRules.searchText, q))
        .orderBy(...ordenar(specialRules.name, q))
        .limit(limit),
      db
        .select()
        .from(magicItems)
        .where(filtroTexto(magicItems.searchText, q))
        .orderBy(...ordenar(magicItems.name, q))
        .limit(limit),
    ]);

    res.json({
      query: { q, army, limit },
      counts: {
        units: unidades.length,
        rules: reglas.length,
        items: items.length,
        total: unidades.length + reglas.length + items.length,
      },
      results: { units: unidades, rules: reglas, items },
    });
  } catch (err) {
    log.error('Search failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────

rulesRouter.get('/kb/stats', async (_req, res) => {
  if (!(await exigirDb(res))) return;
  try {
    const [[unidades], [reglas], [items], [reglasEs], [itemsEs]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(units),
      db.select({ n: sql<number>`count(*)::int` }).from(specialRules),
      db.select({ n: sql<number>`count(*)::int` }).from(magicItems),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(specialRules)
        .where(sql`${specialRules.descriptionEs} is not null`),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(magicItems)
        .where(sql`${magicItems.descriptionEs} is not null`),
    ]);
    res.json({
      units: unidades?.n ?? 0,
      rules: reglas?.n ?? 0,
      items: items?.n ?? 0,
      /** Cuántas reglas tienen traducción: distingue "vacío" de "en inglés". */
      rulesTranslated: reglasEs?.n ?? 0,
      /**
       * Lo mismo para items.
       *
       * Sin este número, `/sobre` sólo podía decir "traducido" o "en inglés"
       * mirando las reglas, y el estado real del corpus no es binario: las
       * unidades no se traducen nunca —son statlines y nombres propios— y
       * siempre quedan reglas sueltas sin traducir. Decir "el corpus está en
       * español" a secas era falso justamente cuando el pipeline funcionaba.
       */
      itemsTranslated: itemsEs?.n ?? 0,
    });
  } catch (err) {
    log.error('KB stats failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to get KB stats' });
  }
});
