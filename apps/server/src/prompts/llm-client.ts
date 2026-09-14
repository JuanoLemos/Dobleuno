/**
 * Cliente DeepSeek (OpenAI-compatible).
 *
 * DeepSeek expone una API compatible con OpenAI Chat Completions, así que usamos
 * el SDK oficial de OpenAI apuntando a la base URL de DeepSeek. Si en el futuro
 * queremos cambiar de provider (OpenAI, Azure, Together, etc.), es 1 línea.
 *
 * Variables de entorno:
 *   DEEPSEEK_API_KEY    requerida
 *   DEEPSEEK_BASE_URL   default https://api.deepseek.com
 *   DEEPSEEK_MODEL      default deepseek-flash
 */

import OpenAI from 'openai';

export const DEEPSEEK_DEFAULT_BASE_URL = 'https://api.deepseek.com';
/**
 * Modelo por defecto.
 *
 * Era 'deepseek-chat' (V3). En la Ola 12 el diagnóstico de `deepseek:doctor`
 * mostró que `GET /models` ya no lo lista: la cuenta ofrece `deepseek-flash` y
 * `deepseek-v4-pro`. Pedir un modelo inexistente no devuelve 404 — la API
 * acepta y se queda colgada, que es el peor modo de falla posible.
 */
export const DEEPSEEK_DEFAULT_MODEL = 'deepseek-flash';

/**
 * Timeouts del cliente.
 *
 * El SDK de OpenAI trae 10 minutos por defecto. Con eso, una request que el
 * proveedor acepta y no contesta deja la conexión colgada hasta que undici la
 * mata por su cuenta con `UND_ERR_HEADERS_TIMEOUT` — que fue exactamente lo
 * que pasó al verificar el oráculo en la Ola 11, y que no dice nada útil.
 */
export const DEEPSEEK_TIMEOUT_MS = 45_000;
export const DEEPSEEK_MAX_RETRIES = 2;

export function getDeepSeekConfig(): {
  apiKey: string;
  baseURL: string;
  model: string;
} {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY no configurada. Copiá .env.example a .env y completá la key.',
    );
  }
  return {
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || DEEPSEEK_DEFAULT_BASE_URL,
    model: process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL,
  };
}

export function createDeepSeekClient(): OpenAI {
  const { apiKey, baseURL } = getDeepSeekConfig();
  return new OpenAI({
    apiKey,
    baseURL,
    timeout: DEEPSEEK_TIMEOUT_MS,
    maxRetries: DEEPSEEK_MAX_RETRIES,
  });
}

export function getModel(): string {
  return process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL;
}
