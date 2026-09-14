/**
 * Dexie — cache local del Codex (offline-first).
 *
 * Réplica de las tablas de Postgres, para que el Codex se pueda leer al lado
 * de la mesa sin señal. Se llena a medida que el usuario navega: cada lista y
 * cada detalle que vuelve del server se guarda acá.
 *
 * ── v3 (Ola 11) ──────────────────────────────────────────────────────────
 *
 * La v2 modelaba el corpus viejo: `faction` con dos valores, `category` con
 * cinco, `rarity` con cuatro, stats numéricos. El corpus real tiene 31
 * ejércitos, 31 secciones de reglamento y statlines con "-", "(+1)" y "2D6".
 * No hay migración posible de un shape al otro, así que el `upgrade()` borra
 * las tres tablas: lo que había era del pipeline roto y no vale nada.
 */
import Dexie, { type Table } from 'dexie';
import type { KBFAQ } from '@dobleuno/shared';

/** Campos comunes a todo lo cacheado. */
interface Cacheado {
  cachedAt: number;
}

export interface CachedRule extends Cacheado {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** null = todavía no se tradujo. */
  nameEs: string | null;
  descriptionEs: string | null;
  ruleType: string;
  associations: string[];
  related: string[];
  sourcePage: string;
  sourceUrl: string;
}

export interface CachedMagicItem extends Cacheado {
  id: string;
  slug: string;
  name: string;
  type: string;
  cost: number;
  description: string;
  nameEs: string | null;
  descriptionEs: string | null;
  itemTypes: string[];
  associations: string[];
  sourcePage: string;
  sourceUrl: string;
}

export interface CachedUnit extends Cacheado {
  id: string;
  slug: string;
  name: string;
  nameSingular: string;
  army: string;
  unitCategory: string;
  troopTypes: string[];
  /** Statlines como strings: el sitio usa "-", "(+1)", "2D6". */
  profile: Array<Record<string, string>>;
  baseSize: string;
  unitSize: string;
  cost: number | null;
  costOverride: string;
  armourValue: string;
  equipment: string;
  specialRules: string;
  options: string;
  sourcePage: string;
  sourceUrl: string;
}

export interface SyncMeta {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface DobleunoDB extends Dexie {
  units: Table<CachedUnit, string>;
  rules: Table<CachedRule, string>;
  items: Table<CachedMagicItem, string>;
  faqs: Table<KBFAQ, string>;
  syncMeta: Table<SyncMeta, string>;
}

export const db = new Dexie('DobleunoDB') as DobleunoDB;

db.version(2).stores({
  units: 'id, faction, category, name, cachedAt',
  rules: 'id, name, category, cachedAt',
  items: 'id, name, rarity, cachedAt',
  faqs: 'id, *tags',
  syncMeta: 'key, updatedAt',
});

db.version(3)
  .stores({
    units: 'id, slug, name, army, unitCategory, cachedAt',
    rules: 'id, slug, name, ruleType, cachedAt',
    items: 'id, slug, name, type, cachedAt',
    faqs: 'id, *tags',
    syncMeta: 'key, updatedAt',
  })
  .upgrade(async (tx) => {
    // Lo cacheado en v2 son las 39 entradas basura del mirror roto. Se tiran.
    await Promise.all([
      tx.table('units').clear(),
      tx.table('rules').clear(),
      tx.table('items').clear(),
    ]);
  });

/**
 * TTL de la cache: 7 días.
 *
 * Eran 24 h cuando la cache era un espejo de una búsqueda. Ahora es el corpus
 * para leer sin señal, y el corpus cambia cuando GW publica una errata: que se
 * vacíe cada día deja al usuario sin reglas justo donde no hay wifi.
 */
export const KB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function estaFresco(cachedAt: number): boolean {
  return Date.now() - cachedAt < KB_CACHE_TTL_MS;
}
