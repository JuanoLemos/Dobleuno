/**
 * Validación de variables de entorno con Zod.
 * Falla rápido en boot si falta algo crítico.
 */
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z
    .string()
    .url()
    .default('postgres://dobleuno:dobleuno_dev@localhost:5432/dobleuno'),

  BETTER_AUTH_SECRET: z
    .string()
    .min(16, 'BETTER_AUTH_SECRET debe tener al menos 16 caracteres')
    .default('dev-secret-change-me-min-32-chars-recommended'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),

  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  /**
   * Ola 7.1 — Lista de emails administradores, comma-separated.
   * Al boot, promote-admin.ts marca is_admin=true para estos users.
   * Vacío por default en dev; configurar antes de deploy a prod.
   */
  ADMIN_EMAILS: z.string().default(''),

  /**
   * Ola 7.1 — Donde el sync KB persiste mirror + parse output.
   * Default: `<repo-root>/data/` (resuelto via import.meta.url, no depende de cwd).
   */
  KB_DATA_DIR: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
