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

/**
 * Secretos que NO pueden llegar a producción.
 *
 * Una regla de longitud no alcanza: el default que traía el docker-compose,
 * `change-me-in-production-min-32-chars`, tiene 35 caracteres. Pasaba el
 * `.min(16)` sin despeinarse, así que el server arrancaba en producción con el
 * secreto de ejemplo y no lo decía en ningún lado. Hace falta nombrarlos.
 */
const SECRETOS_PROHIBIDOS = [
  'dev-secret-change-me-min-32-chars-recommended',
  'change-me-in-production-min-32-chars',
];

function esLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * Lo que producción exige y desarrollo no.
 *
 * Hasta la Ola 12 **ninguna** variable era obligatoria: todas tenían default o
 * eran opcionales. El docblock de arriba decía "falla rápido en boot si falta
 * algo crítico" y no se cumplía para ningún valor — el server levantaba con el
 * secreto de ejemplo, sin API key y apuntando a un Postgres de localhost, sin
 * una sola queja.
 *
 * Los defaults permisivos siguen en dev y en test, que es donde sirven.
 */
function exigenciasDeProduccion(
  v: z.infer<typeof EnvSchema>,
  ctx: z.RefinementCtx,
): void {
  if (v.NODE_ENV !== 'production') return;

  const falta = (path: keyof z.infer<typeof EnvSchema>, message: string): void => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  };

  if (esLocal(v.DATABASE_URL)) {
    falta('DATABASE_URL', 'apunta a localhost: configurá la base de producción');
  }
  if (SECRETOS_PROHIBIDOS.includes(v.BETTER_AUTH_SECRET) || /^change-me/i.test(v.BETTER_AUTH_SECRET)) {
    falta('BETTER_AUTH_SECRET', 'es un valor de ejemplo. Generá uno: openssl rand -base64 32');
  }
  if (v.BETTER_AUTH_SECRET.length < 32) {
    falta('BETTER_AUTH_SECRET', 'en producción debe tener al menos 32 caracteres');
  }
  if (esLocal(v.BETTER_AUTH_URL)) {
    falta('BETTER_AUTH_URL', 'apunta a localhost: poné el origen público');
  }
  if (!v.DEEPSEEK_API_KEY) {
    falta(
      'DEEPSEEK_API_KEY',
      'sin ella el oráculo responde con un mock de citas inventadas y HTTP 200',
    );
  }
  if (v.OPENAI_API_KEY) {
    falta(
      'OPENAI_API_KEY',
      'el provider de OpenAI devuelve 1536 dimensiones y la columna es vector(384): ' +
        'con esta key el seed deja los embeddings en NULL y el oráculo deja de encontrar nada. ' +
        'Ver .env.production.example.',
    );
  }
}

const parsed = EnvSchema.superRefine(exigenciasDeProduccion).safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
