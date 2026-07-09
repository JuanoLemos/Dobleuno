/**
 * Schema de Knowledge Base de TOW.
 * Almacena unidades, items mágicos, reglas especiales, scenarios.
 * Datos parseados desde tow.whfb.app (Ola 2).
 */

import { pgTable, text, integer, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────

export const factionEnum = pgEnum('faction', ['empire', 'bretonnia']);
export const unitCategoryEnum = pgEnum('unit_category', [
  'lord',
  'hero',
  'core',
  'special',
  'rare',
]);
export const rarityEnum = pgEnum('rarity', ['common', 'uncommon', 'rare', 'very-rare']);
export const ruleCategoryEnum = pgEnum('rule_category', [
  'combat',
  'shooting',
  'magic',
  'movement',
  'leadership',
  'equipment',
  'armour',
  'psychology',
]);
export const ingestStatusEnum = pgEnum('ingest_status', ['pending', 'running', 'completed', 'failed']);

// ─── Units ────────────────────────────────────────────────────────────────

export const units = pgTable(
  'units',
  {
    id: text('id').primaryKey(), // ej: 'empire-greatswords'
    faction: factionEnum('faction').notNull(),
    category: unitCategoryEnum('category').notNull(),
    name: text('name').notNull(),
    // Stats
    m: integer('m').notNull(),
    ws: integer('ws').notNull(),
    bs: integer('bs').notNull(),
    s: integer('s').notNull(),
    t: integer('t').notNull(),
    w: integer('w').notNull(),
    i: integer('i').notNull(),
    a: integer('a').notNull(),
    ld: integer('ld').notNull(),
    sv: text('sv').notNull(), // ej: '3+'
    // Estructura
    minSize: integer('min_size').notNull().default(1),
    maxSize: integer('max_size'),
    pointsPerModel: integer('points_per_model'),
    pointsFixed: integer('points_fixed'),
    commandGroup: jsonb('command_group').$type<{
      champion?: number;
      standard?: number;
      musician?: number;
    }>(),
    weapons: jsonb('weapons')
      .$type<
        Array<{
          name: string;
          range: string;
          strength: number;
          armorPenetration: number;
          rules: string[];
        }>
      >()
      .notNull()
      .default([]),
    specialRules: text('special_rules').array().notNull().default([]),
    options: jsonb('options')
      .$type<Array<{ name: string; points: number; description?: string }>>()
      .notNull()
      .default([]),
    // Source
    sourcePage: text('source_page').notNull(),
    lastVerified: timestamp('last_verified').notNull().defaultNow(),
    // Full-text search
    searchText: text('search_text'), // para tsvector
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    factionIdx: index('units_faction_idx').on(t.faction),
    categoryIdx: index('units_category_idx').on(t.category),
    nameIdx: index('units_name_idx').on(t.name),
  }),
);

// ─── Special rules ────────────────────────────────────────────────────────

export const specialRules = pgTable(
  'special_rules',
  {
    id: text('id').primaryKey(), // ej: 'rule-great-weapon'
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: ruleCategoryEnum('category').notNull(),
    sourcePage: text('source_page').notNull(),
    lastVerified: timestamp('last_verified').notNull().defaultNow(),
    searchText: text('search_text'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index('rules_name_idx').on(t.name),
    categoryIdx: index('rules_category_idx').on(t.category),
  }),
);

// ─── Magic items ───────────────────────────────────────────────────────────

export const magicItems = pgTable(
  'magic_items',
  {
    id: text('id').primaryKey(), // ej: 'item-talisman-of-preservation'
    name: text('name').notNull(),
    rarity: rarityEnum('rarity').notNull(),
    points: integer('points').notNull().default(0),
    description: text('description').notNull(),
    factionRestriction: text('faction_restriction').array().notNull().default([]),
    characterRestriction: text('character_restriction').array().notNull().default([]),
    sourcePage: text('source_page').notNull(),
    lastVerified: timestamp('last_verified').notNull().defaultNow(),
    searchText: text('search_text'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index('items_name_idx').on(t.name),
    rarityIdx: index('items_rarity_idx').on(t.rarity),
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

// ─── Type exports ─────────────────────────────────────────────────────────

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type SpecialRule = typeof specialRules.$inferSelect;
export type MagicItem = typeof magicItems.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type IngestLog = typeof ingestLog.$inferSelect;
