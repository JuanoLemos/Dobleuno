/**
 * CLI para correr migraciones de Drizzle contra la DB.
 *
 * Uso:
 *   npm run db:migrate -w @dobleuno/server      # dev, con tsx
 *   node apps/server/dist/db/migrate.js         # prod, dentro del contenedor
 *
 * ── Por qué el path se resuelve con import.meta.url ──────────────────────
 *
 * Antes era `migrationsFolder: './src/db/migrations'`, relativo al cwd. Eso
 * funcionaba *por accidente*: `npm run -w @dobleuno/server` pone el cwd en
 * `apps/server`, así que el path cerraba. Invocado de cualquier otra forma
 * —que es exactamente lo que hace el contenedor, con WORKDIR /app— apuntaba a
 * `/app/src/db/migrations`, que no existe.
 *
 * Resuelto desde `import.meta.url`, el mismo archivo funciona en `src/` bajo
 * tsx y en `dist/` bajo node, porque las dos carpetas están a la misma
 * profundidad. El Dockerfile copia los `.sql` a `dist/db/migrations`, porque
 * `tsc` sólo emite JS y los dejaría afuera de la imagen.
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

import { env } from '../env.js';
import { log } from '../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * pgvector va aparte de las migraciones de Drizzle.
 *
 * No está en el journal porque drizzle-kit no lo generó (pgvector no es nativo
 * de Drizzle) y su número colisiona con `0001_ambitious_starbolt`. Se aplica
 * después, y es idempotente de punta a punta: `IF NOT EXISTS` y
 * `CREATE OR REPLACE`.
 *
 * Se ejecuta con el Pool que ya está abierto, no con `psql`: la imagen de
 * producción es `node:22-alpine`, que no trae el binario, y sumar
 * `postgresql-client` es meter un paquete y un shell más en prod para un
 * `CREATE EXTENSION`.
 *
 * El archivo se manda entero, en una sola llamada. Partirlo por `;` rompería
 * el cuerpo `$$ … $$` de plpgsql, que tiene `;` adentro.
 */
const SQL_FUERA_DEL_JOURNAL: Array<[archivo: string, que: string]> = [
  ['0001_pgvector.sql', 'pgvector: extensión, trigger e índice'],
  ['extra_busqueda_lexica.sql', 'búsqueda léxica: columna tsv e índice GIN'],
];

async function aplicarExtras(pool: pg.Pool): Promise<void> {
  for (const [archivo, que] of SQL_FUERA_DEL_JOURNAL) {
    const ruta = join(MIGRATIONS_DIR, archivo);
    if (!existsSync(ruta)) {
      log.warn(`No se encontró ${ruta}; salteo.`);
      continue;
    }
    await pool.query(readFileSync(ruta, 'utf-8'));
    log.info(`${que}: al día`);
  }
}

async function main(): Promise<void> {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  log.info('Running migrations...', {
    url: env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'),
    from: MIGRATIONS_DIR,
  });

  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(
      `No hay migraciones en ${MIGRATIONS_DIR}. ` +
        'Si esto es el contenedor, el Dockerfile no copió src/db/migrations a dist/.',
    );
  }

  await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
  log.info('Migrations complete');

  await aplicarExtras(pool);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  log.error('Migration failed', { error: (err as Error).message });
  process.exit(1);
});
