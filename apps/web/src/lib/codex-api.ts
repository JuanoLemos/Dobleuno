/**
 * Cliente del Codex — reglas especiales e items mágicos.
 *
 * Patrón de cronicas-api.ts, más una capa de cache en Dexie: todo lo que
 * vuelve del server se guarda, y si no hay red se responde desde ahí. El
 * Codex se usa al lado de la mesa, donde la señal es lo primero que falta.
 *
 * El corpus NO se bundlea con la app: son 3 MB de texto derivado de material
 * de Games Workshop, y doc/Sources.md dice que no se redistribuye. Va del
 * server a IndexedDB, que es del usuario.
 */
import { api, ApiError } from './api.js';
import { db, estaFresco } from './dexie-kb.js';
import { log } from './logger-client.js';

// ─── Tipos (el shape que devuelve la API) ────────────────────────────────

export interface CodexRule {
  id: string;
  slug: string;
  name: string;
  description: string;
  nameEs: string | null;
  descriptionEs: string | null;
  ruleType: string;
  associations: string[];
  related: string[];
  sourcePage: string;
  sourceUrl: string;
}

export interface CodexItem {
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

export interface Pagina<T> {
  total: number;
  page: number;
  limit: number;
  entradas: T[];
  /** true si esto salió de IndexedDB y no del server. */
  fromCache: boolean;
  /**
   * Por qué se cayó a la cache. Importa para el mensaje: "sin conexión" cuando
   * el usuario no tiene red, y "el server no tiene el corpus" cuando responde
   * 503. Decirle "sin conexión" a alguien que tiene wifi lo manda a revisar el
   * router en vez de la base.
   */
  motivo?: MotivoDeCache;
}

/**
 * Por qué se está sirviendo desde la cache. Son tres cosas distintas y el
 * usuario puede hacer algo distinto con cada una.
 */
export type MotivoDeCache = 'sin-red' | 'server-caido' | 'server-sin-datos';

export interface Faceta {
  valor: string;
  count: number;
}

export interface ConsultaCodex {
  q?: string;
  /** Sección del reglamento (reglas) o tipo (items). */
  filtro?: string;
  /** Solo items: lista donde está disponible ('empire-of-man-magic-items-type', …). */
  familia?: string;
  page?: number;
  limit?: number;
}

export const LIMITE_POR_PAGINA = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** El texto a mostrar: español si se tradujo, inglés si no. */
export function textoVisible(e: {
  description: string;
  descriptionEs: string | null;
}): string {
  return e.descriptionEs ?? e.description;
}

export function nombreVisible(e: { name: string; nameEs: string | null }): string {
  return e.nameEs ?? e.name;
}

export function estaTraducido(e: { descriptionEs: string | null }): boolean {
  return e.descriptionEs !== null;
}

/**
 * ¿Hay que caer a la cache local?
 *
 * Un 503 es el server sin base; los errores de red no llegan como ApiError. En
 * los dos casos la respuesta correcta es ir a la cache, pero el motivo que se
 * le muestra al usuario es distinto.
 */
function motivoDeFallback(err: unknown): MotivoDeCache | null {
  // Un ApiError significa que el server contestó: solo el 503 justifica la
  // cache. Lo demás (400, 500) es un problema que hay que mostrar, no esconder.
  if (err instanceof ApiError) return err.status === 503 ? 'server-sin-datos' : null;

  // Un fetch que ni llegó a contestar puede ser el usuario sin señal o el
  // server caído. `navigator.onLine` los distingue, y no da lo mismo: a quien
  // tiene wifi, un "sin conexión" lo manda a revisar el router.
  const online = typeof navigator === 'undefined' || navigator.onLine;
  return online ? 'server-caido' : 'sin-red';
}

function ahora(): number {
  return Date.now();
}

function coincide(texto: string, q: string): boolean {
  return texto.toLowerCase().includes(q.toLowerCase());
}

// ─── Reglas ───────────────────────────────────────────────────────────────

interface RespuestaReglas {
  total: number;
  page: number;
  limit: number;
  rules: CodexRule[];
}

export async function listarReglas(consulta: ConsultaCodex = {}): Promise<Pagina<CodexRule>> {
  const page = consulta.page ?? 1;
  const limit = consulta.limit ?? LIMITE_POR_PAGINA;

  try {
    const res = await api<RespuestaReglas>('/api/rules', {
      query: { q: consulta.q, section: consulta.filtro, page, limit },
    });
    void guardarReglas(res.rules);
    return { total: res.total, page, limit, entradas: res.rules, fromCache: false };
  } catch (err) {
    const motivo = motivoDeFallback(err);
    if (!motivo) throw err;
    log.warn('Codex: reglas desde cache', { motivo, error: (err as Error).message });
    return { ...(await buscarReglasLocal(consulta, page, limit)), motivo };
  }
}

export async function obtenerRegla(slug: string): Promise<CodexRule | null> {
  try {
    const regla = await api<CodexRule>(`/api/rules/${encodeURIComponent(slug)}`);
    void guardarReglas([regla]);
    return regla;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (!motivoDeFallback(err)) throw err;
    const local = await db.rules.where('slug').equals(slug).first();
    return local && estaFresco(local.cachedAt) ? local : null;
  }
}

export async function listarSecciones(): Promise<Faceta[]> {
  try {
    const res = await api<{ sections: Array<{ section: string; count: number }> }>(
      '/api/rules/sections',
    );
    return res.sections.map((s) => ({ valor: s.section, count: s.count }));
  } catch {
    // Sin red, las secciones salen de lo que haya cacheado.
    const todas = await db.rules.toArray();
    const cuenta = new Map<string, number>();
    for (const r of todas) {
      if (r.ruleType) cuenta.set(r.ruleType, (cuenta.get(r.ruleType) ?? 0) + 1);
    }
    return [...cuenta].map(([valor, count]) => ({ valor, count })).sort((a, b) => a.valor.localeCompare(b.valor));
  }
}

async function guardarReglas(reglas: CodexRule[]): Promise<void> {
  try {
    const t = ahora();
    await db.rules.bulkPut(reglas.map((r) => ({ ...r, cachedAt: t })));
  } catch (err) {
    log.warn('No se pudo cachear reglas', { error: (err as Error).message });
  }
}

async function buscarReglasLocal(
  consulta: ConsultaCodex,
  page: number,
  limit: number,
): Promise<Pagina<CodexRule>> {
  const todas = (await db.rules.toArray()).filter((r) => estaFresco(r.cachedAt));
  const filtradas = todas
    .filter((r) => !consulta.filtro || r.ruleType === consulta.filtro)
    .filter((r) => !consulta.q || coincide(`${r.name} ${r.description}`, consulta.q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    total: filtradas.length,
    page,
    limit,
    entradas: filtradas.slice((page - 1) * limit, page * limit),
    fromCache: true,
  };
}

// ─── Items ────────────────────────────────────────────────────────────────

interface RespuestaItems {
  total: number;
  page: number;
  limit: number;
  items: CodexItem[];
}

export async function listarItems(consulta: ConsultaCodex = {}): Promise<Pagina<CodexItem>> {
  const page = consulta.page ?? 1;
  const limit = consulta.limit ?? LIMITE_POR_PAGINA;

  try {
    const res = await api<RespuestaItems>('/api/items', {
      query: { q: consulta.q, type: consulta.filtro, family: consulta.familia, page, limit },
    });
    void guardarItems(res.items);
    return { total: res.total, page, limit, entradas: res.items, fromCache: false };
  } catch (err) {
    const motivo = motivoDeFallback(err);
    if (!motivo) throw err;
    log.warn('Codex: items desde cache', { motivo, error: (err as Error).message });
    return { ...(await buscarItemsLocal(consulta, page, limit)), motivo };
  }
}

export async function obtenerItem(slug: string): Promise<CodexItem | null> {
  try {
    const item = await api<CodexItem>(`/api/items/${encodeURIComponent(slug)}`);
    void guardarItems([item]);
    return item;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (!motivoDeFallback(err)) throw err;
    const local = await db.items.where('slug').equals(slug).first();
    return local && estaFresco(local.cachedAt) ? local : null;
  }
}

export async function listarTiposDeItem(): Promise<Faceta[]> {
  try {
    const res = await api<{ types: Array<{ type: string; count: number }> }>('/api/items/types');
    return res.types.map((t) => ({ valor: t.type, count: t.count }));
  } catch {
    const todos = await db.items.toArray();
    const cuenta = new Map<string, number>();
    for (const i of todos) {
      if (i.type) cuenta.set(i.type, (cuenta.get(i.type) ?? 0) + 1);
    }
    return [...cuenta].map(([valor, count]) => ({ valor, count })).sort((a, b) => a.valor.localeCompare(b.valor));
  }
}

async function guardarItems(items: CodexItem[]): Promise<void> {
  try {
    const t = ahora();
    await db.items.bulkPut(items.map((i) => ({ ...i, cachedAt: t })));
  } catch (err) {
    log.warn('No se pudo cachear items', { error: (err as Error).message });
  }
}

async function buscarItemsLocal(
  consulta: ConsultaCodex,
  page: number,
  limit: number,
): Promise<Pagina<CodexItem>> {
  const todos = (await db.items.toArray()).filter((i) => estaFresco(i.cachedAt));
  const filtrados = todos
    .filter((i) => !consulta.filtro || i.type === consulta.filtro)
    .filter((i) => !consulta.familia || i.itemTypes.includes(consulta.familia))
    .filter((i) => !consulta.q || coincide(`${i.name} ${i.description}`, consulta.q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    total: filtrados.length,
    page,
    limit,
    entradas: filtrados.slice((page - 1) * limit, page * limit),
    fromCache: true,
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────

export interface CodexStats {
  units: number;
  rules: number;
  items: number;
  rulesTranslated: number;
  itemsTranslated: number;
}

export async function statsDelCodex(): Promise<CodexStats | null> {
  try {
    return await api<CodexStats>('/api/kb/stats');
  } catch {
    return null;
  }
}

/** Cuánto hay guardado para leer sin señal. */
export async function statsLocales(): Promise<{ rules: number; items: number }> {
  const [rules, items] = await Promise.all([db.rules.count(), db.items.count()]);
  return { rules, items };
}
