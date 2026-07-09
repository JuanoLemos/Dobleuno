import { z } from 'zod';

/**
 * Validación de variables de entorno del cliente con Zod.
 * Las vars VITE_* se inyectan en build time.
 */
const EnvSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3000'),
  VITE_APP_NAME: z.string().default('Dobleuno'),
  VITE_APP_VERSION: z.string().default('0.2.0'),
  VITE_DEFAULT_LOCALE: z.enum(['es-AR', 'en']).default('es-AR'),
});

const parsed = EnvSchema.safeParse(import.meta.env);
export const env = parsed.success
  ? parsed.data
  : { VITE_API_URL: 'http://localhost:3000', VITE_APP_NAME: 'Dobleuno', VITE_APP_VERSION: '0.2.0', VITE_DEFAULT_LOCALE: 'es-AR' as const };
