/**
 * Dexie schema — IndexedDB para offline-first.
 * Ola 1: schema inicial vacío (se llena en Olas 2-4).
 */
import Dexie, { type Table } from 'dexie';
import type { KBUnit, List, BattleState } from '@dobleuno/shared';

export interface DobleunoDB extends Dexie {
  units: Table<KBUnit, string>;
  lists: Table<List, string>;
  battles: Table<BattleState, string>;
  faqs: Table<{ id: string; question: string; answer: string; tags: string[] }, string>;
  syncMeta: Table<{ key: string; value: unknown; updatedAt: string }, string>;
}

export const db = new Dexie('DobleunoDB') as DobleunoDB;

db.version(1).stores({
  units: 'id, faction, category, name',
  lists: 'id, userId, faction, updatedAt',
  battles: 'id, userId, status, updatedAt',
  faqs: 'id, *tags',
  syncMeta: 'key, updatedAt',
});
