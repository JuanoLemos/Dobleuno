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

  /**
   * Origen permitido por CORS. Vacío = no montar CORS.
   *
   * Con la API y el cliente en el mismo origen (la topología de la Ola 12) no
   * hace falta, y el default a localhost:5173 dejaba habilitado un origen de
   * desarrollo en producción. Acepta vacío a propósito: era `.url()`, que
   * rechaza el string vacío, así que dejarla en blanco no desactivaba CORS —
   * impedía que el server arrancara.
   */
  CORS_ORIGIN: z
    .string()
    .default('')
    .refine((v) => v === '' || URL.canParse(v), { message: 'CORS_ORIGIN debe ser una URL o vacío' }),

  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-flash'),
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

  /**
   * Ola 10 — Donde se guardan las fotos de las crónicas.
   * Default: `<repo-root>/uploads/`. En Docker es el volumen `dobleuno-uploads`
   * montado en `/app/uploads`.
   *
   * Va separado de KB_DATA_DIR a propósito: la KB es cache regenerable, las
   * fotos son dato de usuario irremplazable.
   */
  UPLOADS_DIR: z.string().optional(),

  /**
   * Ola 12 — Dónde está el build del cliente que sirve este mismo server.
   * Default: `apps/web/dist` relativo al bundle. En Docker, `/app/web-dist`.
   *
   * Estaba leída con `process.env` crudo desde app.ts, esquivando este schema
   * entero — que es justamente el mecanismo con el que el proyecto falla
   * rápido cuando falta algo.
   */
  WEB_DIST_DIR: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
