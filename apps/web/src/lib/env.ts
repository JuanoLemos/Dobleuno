import { z } from 'zod';

/**
 * Validación de variables de entorno del cliente con Zod.
 * Las vars VITE_* se inyectan en build time.
 *
 * ── VITE_API_URL vacío = mismo origen (Ola 12) ───────────────────────────
 *
 * La topología de producción es un solo contenedor: Express sirve la API y
 * este SPA desde el mismo origen, así que la base correcta es "ninguna" y las
 * requests salen relativas (`/api/...`).
 *
 * Antes el campo era `z.string().url()`, que **rechaza el string vacío**. Como
 * el `safeParse` fallido caía a un objeto literal con todos los valores por
 * defecto, poner `VITE_API_URL=""` no daba URLs relativas: daba
 * `http://localhost:3000`, y de paso revertía las otras tres variables. Sin un
 * warning. El bundle de producción salía apuntando a localhost.
 */
const EnvSchema = z.object({
  /** Vacío = mismo origen. Con valor, tiene que ser una URL absoluta. */
  VITE_API_URL: z
    .string()
    .default('')
    .refine((v) => v === '' || URL.canParse(v), {
      message: 'VITE_API_URL debe ser una URL absoluta, o vacío para usar el mismo origen',
    }),
  VITE_APP_NAME: z.string().default('Dobleuno'),
  VITE_APP_VERSION: z.string().default('0.0.0'),
  VITE_DEFAULT_LOCALE: z.enum(['es-AR', 'en']).default('es-AR'),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // Un typo en cualquier VITE_* revertía las cuatro variables a sus defaults
  // en silencio. Que al menos quede en la consola del build y del browser.
  console.error(
    '[env] Variables VITE_* inválidas; se usan los defaults:',
    parsed.error.flatten().fieldErrors,
  );
}

export const env = parsed.success ? parsed.data : EnvSchema.parse({});

/**
 * La base para armar URLs de la API.
 *
 * Con `VITE_API_URL` vacío devuelve el origen de la página, que es lo que
 * corresponde en la topología de un solo contenedor. `new URL(path)` sin base
 * tira `TypeError`, así que esto no es un detalle de estilo.
 */
export function apiBase(): string {
  return env.VITE_API_URL || window.location.origin;
}
