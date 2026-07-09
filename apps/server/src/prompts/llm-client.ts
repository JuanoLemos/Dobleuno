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
 *   DEEPSEEK_MODEL      default deepseek-chat
 */

import OpenAI from 'openai';

export const DEEPSEEK_DEFAULT_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat';

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
  return new OpenAI({ apiKey, baseURL });
}

export function getModel(): string {
  return process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL;
}
