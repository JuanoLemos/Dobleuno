// drizzle.config.ts — config del CLI de migraciones
// Uso: pnpm db:generate (genera migración desde schema), pnpm db:migrate (aplica)
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://dobleuno:dobleuno_dev@localhost:5432/dobleuno',
  },
  strict: true,
  verbose: true,
});
