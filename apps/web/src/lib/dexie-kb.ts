/**
 * Dexie schema para Knowledge Base local (offline-first).
 * Replica del schema de Postgres para que el cliente funcione sin red.
 */
import Dexie, { type Table } from 'dexie';
import type { KBUnit, KBFAQ } from '@dobleuno/shared';

export interface CachedUnit extends KBUnit {
  cachedAt: number;
  cachedFrom: 'server' | 'manual';
}

export interface CachedRule {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'shooting' | 'magic' | 'movement' | 'leadership' | 'equipment' | 'armour' | 'psychology';
  cachedAt: number;
}

export interface CachedMagicItem {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare';
  points: number;
  description: string;
  cachedAt: number;
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

/** TTL de la cache local: 24 horas. */
export const KB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
