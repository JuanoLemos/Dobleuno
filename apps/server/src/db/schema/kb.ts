/**
 * Schema de Knowledge Base de TOW.
 * Almacena unidades, items mágicos, reglas especiales, scenarios.
 * Datos parseados desde tow.whfb.app (Ola 2).
 *
 * Ola 5: agrega tabla `kb_chunks` para RAG (pgvector embeddings).
 *
 * Ola 11: la taxonomía pasa a texto libre. El esquema original asumía 2
 * facciones, 5 categorías de unidad, 8 de regla y 4 rarezas, escrito antes de
 * ver los datos. El corpus real de tow.whfb.app tiene 19 ejércitos, 32
 * secciones de reglamento y 70 familias de item, y los statlines usan "-",
 * "(+1)" y "2D6", que no entran en un integer. Forzar ese mapeo fue lo que
 * hizo que las 39 reglas del mirror viejo cayeran todas en 'equipment'.
 *
 * Los valores vienen del sitio; si una vista necesita agrupar más grueso, que
 * lo haga con un mapeo explícito y visible, no con un enum en la DB.
 */

import { pgTable, text, integer, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────

export const ingestStatusEnum = pgEnum('ingest_status', ['pending', 'running', 'completed', 'failed']);

// ─── Units ────────────────────────────────────────────────────────────────

export const units = pgTable(
  'units',
  {
    /** ej: 'unit-greatswords'. */
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    nameSingular: text('name_singular').notNull().default(''),
    /** Ejército: 'empire-of-man', 'kingdom-of-bretonnia', … (19 en el corpus). */
    army: text('army').notNull().default(''),
    /** Publicaciones y ejércitos a los que pertenece. */
    associations: text('associations').array().notNull().default([]),
    /** 'Character', 'Core', 'Special', 'Rare', … tal como lo publica el sitio. */
    unitCategory: text('unit_category').notNull().default(''),
    troopTypes: text('troop_types').array().notNull().default([]),
    /**
     * Statlines. Array porque una entrada puede traer varios perfiles (jinete
     * y montura). Los valores son string: el sitio usa '-', '(+1)', '2D6'.
     */
    profile: jsonb('profile').$type<Array<Record<string, string>>>().notNull().default([]),
    baseSize: text('base_size').notNull().default(''),
    unitSize: text('unit_size').notNull().default(''),
    /** Costo en puntos. null = el sitio no declara uno. */
    cost: integer('cost'),
    /** ej: '+120 points'. */
    costOverride: text('cost_override').notNull().default(''),
    armourValue: text('armour_value').notNull().default(''),
    /** Bloques en texto plano, tal como los publica el sitio. */
    equipment: text('equipment').notNull().default(''),
    specialRules: text('special_rules').notNull().default(''),
    options: text('options').notNull().default(''),
    sourcePage: text('source_page').notNull(),
    sourceUrl: text('source_url').notNull().default(''),
    lastVerified: timestamp('last_verified').notNull().defaultNow(),
    searchText: text('search_text'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    armyIdx: index('units_army_idx').on(t.army),
    categoryIdx: index('units_category_idx').on(t.unitCategory),
    nameIdx: index('units_name_idx').on(t.name),
    slugIdx: index('units_slug_idx').on(t.slug),
  }),
);

// ─── Special rules ────────────────────────────────────────────────────────

export const specialRules = pgTable(
  'special_rules',
  {
    /** ej: 'rule-great-weapon'. */
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    /** Sección del reglamento: 'special-rules', 'the-combat-phase', … (32). */
    ruleType: text('rule_type').notNull().default(''),
    associations: text('associations').array().notNull().default([]),
    /** Slugs de reglas relacionadas, para navegación cruzada. */
    related: text('related').array().notNull().default([]),
    sourcePage: text('source_page').notNull(),
    sourceUrl: text('source_url').notNull().default(''),
    lastVerified: timestamp('last_verified').notNull().defaultNow(),
    searchText: text('search_text'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index('rules_name_idx').on(t.name),
    typeIdx: index('rules_type_idx').on(t.ruleType),
    slugIdx: index('rules_slug_idx').on(t.slug),
  }),
);

// ─── Magic items ───────────────────────────────────────────────────────────

export const magicItems = pgTable(
  'magic_items',
  {
    /** ej: 'item-talisman-of-preservation'. */
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Clasificación del sitio: 'Ability', 'Weapon', … */
    type: text('type').notNull().default(''),
    /** Costo en puntos. */
    cost: integer('cost').notNull().default(0),
    description: text('description').notNull(),
    /** Familias: 'arcane-items', 'armour-runes', … (70 en el corpus). */
    itemTypes: text('item_types').array().notNull().default([]),
    associations: text('associations').array().notNull().default([]),
    sourcePage: text('source_page').notNull(),
    sourceUrl: text('source_url').notNull().default(''),
    lastVerified: timestamp('last_verified').notNull().defaultNow(),
    searchText: text('search_text'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index('items_name_idx').on(t.name),
    typeIdx: index('items_type_idx').on(t.type),
    slugIdx: index('items_slug_idx').on(t.slug),
  }),
);

// ─── Scenarios (placeholder, Ola 4+) ──────────────────────────────────────

export const scenarios = pgTable('scenarios', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  setup: jsonb('setup').$type<Record<string, unknown>>().notNull(),
  sourcePage: text('source_page'),
  lastVerified: timestamp('last_verified').notNull().defaultNow(),
});

// ─── Ingest log ───────────────────────────────────────────────────────────

export const ingestLog = pgTable('ingest_log', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'mirror' | 'parse' | 'ingest'
  faction: text('faction'), // null = all
  status: ingestStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
  filesProcessed: integer('files_processed').notNull().default(0),
  filesFailed: integer('files_failed').notNull().default(0),
  errorMessage: text('error_message'),
});

// ─── KB chunks (Ola 5 — RAG embeddings via pgvector) ──────────────────────

export const chunkSourceEnum = pgEnum('chunk_source', [
  'unit',
  'rule',
  'item',
  'scenario',
  'faq',
]);

/**
 * Cada chunk es un "pedazo" de texto de la KB con su embedding vectorial.
 * El embedding se almacena como `vector(384)` (pgvector). Por defecto usamos
 * 384 dimensiones porque es lo que devuelven modelos locales tipo
 * sentence-transformers/all-MiniLM-L6-v2. Si en producción se usa OpenAI
 * text-embedding-3-small (1536) o text-embedding-3-large (3072), ajustar
 * la dimensión y la columna.
 *
 * IMPORTANTE: requiere `CREATE EXTENSION IF NOT EXISTS vector;` (ver migration).
 * Para correr local sin pgvector, el schema funciona pero el endpoint /api/ask
 * devuelve 503 con mensaje explicativo.
 */
export const kbChunks = pgTable(
  'kb_chunks',
  {
    id: text('id').primaryKey(), // ej: 'chunk-empire-greatswords-rules'
    source: chunkSourceEnum('source').notNull(),
    ref: text('ref').notNull(), // FK lógico: unit.ref, rule.id, item.id, etc.
    title: text('title').notNull(),
    text: text('text').notNull(),
    faction: text('faction'), // 'empire' | 'bretonnia' | null = genérico
    embedding: text('embedding').notNull(), // JSON-serialized number[] (384 dims)
    // Postgres pgvector column se agrega via migration SQL custom (no Drizzle nativo)
    // Ver apps/server/src/db/migrations/<n>_pgvector.sql
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    sourceIdx: index('kb_chunks_source_idx').on(t.source),
    refIdx: index('kb_chunks_ref_idx').on(t.ref),
    factionIdx: index('kb_chunks_faction_idx').on(t.faction),
  }),
);

// ─── Type exports ─────────────────────────────────────────────────────────

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type SpecialRule = typeof specialRules.$inferSelect;
export type MagicItem = typeof magicItems.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type IngestLog = typeof ingestLog.$inferSelect;
export type KBChunk = typeof kbChunks.$inferSelect;
export type NewKBChunk = typeof kbChunks.$inferInsert;
