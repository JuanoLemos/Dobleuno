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
