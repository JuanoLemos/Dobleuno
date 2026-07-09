/**
 * Sincronización de KB desde el server a Dexie.
 * Background, idempotente, con TTL.
 */
import { db, KB_CACHE_TTL_MS, type CachedUnit, type CachedRule, type CachedMagicItem } from './dexie-kb.js';
import { api, ApiError } from './api.js';
import { log } from './logger-client.js';

interface ServerUnit {
  id: string;
  faction: 'empire' | 'bretonnia';
  category: 'lord' | 'hero' | 'core' | 'special' | 'rare';
  name: string;
  m: number;
  ws: number;
  bs: number;
  s: number;
  t: number;
  w: number;
  i: number;
  a: number;
  ld: number;
  sv: string;
  weapons: Array<{ name: string; range: string; strength: number; armorPenetration: number; rules: string[] }>;
  specialRules: string[];
  pointsPerModel?: number;
  pointsFixed?: number;
  minSize: number;
  maxSize?: number;
  commandGroup?: { champion?: number; standard?: number; musician?: number };
  options: Array<{ name: string; points: number; description?: string }>;
  sourcePage: string;
  lastVerified: string;
}

interface ServerRule {
  id: string;
  name: string;
  description: string;
  category: CachedRule['category'];
}

interface ServerItem {
  id: string;
  name: string;
  rarity: CachedMagicItem['rarity'];
  points: number;
  description: string;
}

interface SearchResponse {
  results: { units: ServerUnit[]; rules: ServerRule[]; items: ServerItem[] };
  counts: { units: number; rules: number; items: number; total: number };
}

interface StatsResponse {
  units: number;
  rules: number;
  items: number;
}

/** Convierte un Unit del server al formato CachedUnit. */
function toCachedUnit(srv: ServerUnit): CachedUnit {
  return {
    id: srv.id,
    faction: srv.faction,
    category: srv.category,
    name: srv.name,
    stats: {
      M: srv.m,
      WS: srv.ws,
      BS: srv.bs,
      S: srv.s,
      T: srv.t,
      W: srv.w,
      I: srv.i,
      A: srv.a,
      Ld: srv.ld,
      Sv: srv.sv,
    },
    weapons: srv.weapons,
    specialRules: srv.specialRules,
    pointsPerModel: srv.pointsPerModel,
    pointsFixed: srv.pointsFixed,
    minSize: srv.minSize,
    maxSize: srv.maxSize,
    commandGroup: srv.commandGroup ?? {},
    options: srv.options,
    source: {
      page: srv.sourcePage,
      lastVerified: srv.lastVerified,
    },
    cachedAt: Date.now(),
    cachedFrom: 'server',
  };
}

/** Resultado de búsqueda combinado. */
export interface SearchResult {
  units: CachedUnit[];
  rules: CachedRule[];
  items: CachedMagicItem[];
  fromCache: boolean;
}

/**
 * Busca en la KB. Online → va al server, cachea resultados en Dexie.
 * Offline → busca en Dexie local.
 */
export async function searchKB(query: {
  q?: string;
  faction?: 'empire' | 'bretonnia';
  category?: 'lord' | 'hero' | 'core' | 'special' | 'rare';
}): Promise<SearchResult> {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const start = performance.now();

  if (online) {
    try {
      const res = await api<SearchResponse>('/api/rules/search', {
        query: {
          q: query.q,
          faction: query.faction,
          category: query.category,
          limit: 50,
        },
      });
      const units = res.results.units.map(toCachedUnit);
      const rules: CachedRule[] = res.results.rules.map((r) => ({
        ...r,
        cachedAt: Date.now(),
      }));
      const items: CachedMagicItem[] = res.results.items.map((i) => ({
        id: i.id,
        name: i.name,
        rarity: i.rarity,
        points: i.points,
        description: i.description,
        cachedAt: Date.now(),
      }));

      // Cachear en background
      void cacheResults({ units, rules, items });

      log.info('KB search online', { ms: Math.round(performance.now() - start), ...res.counts });
      return { units, rules, items, fromCache: false };
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        log.warn('KB server no disponible, fallback a cache local');
      } else {
        log.warn('KB search online falló, fallback a cache local', { error: (err as Error).message });
      }
      // Fallback a cache
      return searchKBLocal(query);
    }
  }

  return searchKBLocal(query);
}

/** Busca SOLO en la cache local (Dexie). */
export async function searchKBLocal(query: {
  q?: string;
  faction?: 'empire' | 'bretonnia';
  category?: 'lord' | 'hero' | 'core' | 'special' | 'rare';
}): Promise<SearchResult> {
  const q = query.q?.toLowerCase() ?? '';

  const [unitsAll, rulesAll, itemsAll] = await Promise.all([
    db.units.toArray(),
    db.rules.toArray(),
    db.items.toArray(),
  ]);

  const now = Date.now();
  const isFresh = (cachedAt: number) => now - cachedAt < KB_CACHE_TTL_MS;

  const units = unitsAll
    .filter((u) => isFresh(u.cachedAt))
    .filter(
      (u) =>
        (!query.faction || u.faction === query.faction) &&
        (!query.category || u.category === query.category) &&
        (!q || u.name.toLowerCase().includes(q) || u.specialRules.some((r) => r.toLowerCase().includes(q))),
    )
    .slice(0, 50);

  const rules = rulesAll
    .filter((r) => isFresh(r.cachedAt))
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
    .slice(0, 50);

  const items = itemsAll
    .filter((i) => isFresh(i.cachedAt))
    .filter((i) => !q || i.name.toLowerCase().includes(q))
    .slice(0, 50);

  return { units, rules, items, fromCache: true };
}

/** Cachea resultados de búsqueda en Dexie. */
async function cacheResults(results: {
  units: CachedUnit[];
  rules: CachedRule[];
  items: CachedMagicItem[];
}): Promise<void> {
  try {
    await Promise.all([
      db.units.bulkPut(results.units),
      db.rules.bulkPut(results.rules),
      db.items.bulkPut(results.items),
      db.syncMeta.put({ key: 'lastSync', value: Date.now(), updatedAt: Date.now() }),
    ]);
  } catch (err) {
    log.warn('Cache write failed', { error: (err as Error).message });
  }
}

/** Stats de la cache local. */
export async function localKBStats(): Promise<{ units: number; rules: number; items: number }> {
  const [units, rules, items] = await Promise.all([
    db.units.count(),
    db.rules.count(),
    db.items.count(),
  ]);
  return { units, rules, items };
}

/** Stats del server. */
export async function serverKBStats(): Promise<StatsResponse | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    return await api<StatsResponse>('/api/kb/stats');
  } catch {
    return null;
  }
}
