/**
 * Helper LLM — wrapper mínimo sobre el cliente DeepSeek con manejo de errores
 * y configuración sensata. Usado por la pipeline RAG (Ola 5).
 *
 * Si DEEPSEEK_API_KEY no está configurada, devuelve un mock determinístico
 * (útil para dev/test sin gastar API).
 */
import OpenAI from 'openai';
import { getDeepSeekConfig } from '../prompts/llm-client.js';
import { log } from './logger.js';

export interface CallLLMInput {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (cachedClient) return cachedClient;
  if (!process.env.DEEPSEEK_API_KEY) {
    return null; // modo mock
  }
  try {
    const cfg = getDeepSeekConfig();
    cachedClient = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    return cachedClient;
  } catch (err) {
    log.warn('DeepSeek no configurado, usando mock', { error: (err as Error).message });
    return null;
  }
}

/**
 * Llama al LLM con system + user prompt.
 * Si no hay API key, devuelve una respuesta mock determinística que cita [cita:1]
 * para que el pipeline RAG se pueda testear end-to-end.
 */
export async function callLLM(input: CallLLMInput): Promise<string> {
  const client = getClient();
  if (!client) {
    return mockLLMResponse(input);
  }
  try {
    const cfg = getDeepSeekConfig();
    const res = await client.chat.completions.create({
      model: input.model ?? cfg.model,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 600,
    });
    return res.choices[0]?.message?.content ?? '';
  } catch (err) {
    log.error('LLM call failed', { error: (err as Error).message });
    throw new Error(`LLM call failed: ${(err as Error).message}`);
  }
}

/** Mock determinístico para dev/test sin DEEPSEEK_API_KEY. */
function mockLLMResponse(input: CallLLMInput): string {
  // Detectar si el user prompt tiene chunks numerados [1], [2], etc.
  const chunks = Array.from(input.user.matchAll(/\[(\d+)\] Fuente:/g));
  if (chunks.length === 0) {
    return 'No tengo contexto suficiente para responder. [cita:1]';
  }
  const firstRef = chunks[0]?.[1] ?? '1';
  return `Según las reglas de TOW [cita:${firstRef}], la respuesta se basa en el contexto cargado. Para una consulta específica, consultá la página oficial del reglamento.`;
}

/** Reset cache (tests). */
export function resetLLMClient(): void {
  cachedClient = null;
}