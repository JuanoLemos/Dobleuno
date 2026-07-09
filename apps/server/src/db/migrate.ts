/**
 * CLI para correr migraciones de Drizzle contra la DB.
 * Uso: pnpm db:migrate
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { env } from '../env.js';
import { log } from '../lib/logger.js';

async function main(): Promise<void> {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool);

  log.info('Running migrations...', { url: env.DATABASE_URL.replace(/:[^:@]*@/, ':***@') });
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  log.info('Migrations complete');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  log.error('Migration failed', { error: (err as Error).message });
  process.exit(1);
});
