/**
 * Cliente de Postgres + Drizzle ORM.
 * Si la DB no está disponible, el server arranca igual y los endpoints
 * que la usan devuelven 503.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../env.js';
import { log } from '../lib/logger.js';
import * as schema from '../db/schema/index.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  log.error('Postgres pool error', { error: err.message });
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;

/**
 * Verifica que la DB esté reachable. Devuelve true/false sin tirar.
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 AS ok');
    return res.rows[0]?.ok === 1;
  } catch (err) {
    log.warn('DB health check failed', { error: (err as Error).message });
    return false;
  }
}

/**
 * Las filas de un `db.execute()`, venga como venga.
 *
 * drizzle/node-postgres lo resuelve con un QueryResult
 * ({ rows, rowCount, command, fields }), no con un array. Otros drivers sí
 * devuelven el array directo, así que se aceptan las dos formas.
 *
 * Vive acá y no adentro de rag.ts porque el error que previene es fácil de
 * repetir: un `Array.isArray()` sobre el QueryResult da false siempre, y el
 * síntoma es una consulta que "no devuelve nada" sin fallar. Pasó una vez en
 * el retrieval del oráculo —contestaba "no tengo información suficiente" a
 * todo— y otra en el seed, escribiendo este mismo comentario.
 */
export function toRows(res: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
  const rows = (res as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}
