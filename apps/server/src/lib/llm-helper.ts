/**
 * Helper LLM — wrapper mínimo sobre el cliente DeepSeek con manejo de errores
 * y configuración sensata. Usado por la pipeline RAG (Ola 5).
 *
 * Si DEEPSEEK_API_KEY no está configurada, devuelve un mock determinístico
 * (útil para dev/test sin gastar API).
 */
import OpenAI from 'openai';
import {
  getDeepSeekConfig,
  DEEPSEEK_TIMEOUT_MS,
  DEEPSEEK_MAX_RETRIES,
} from '../prompts/llm-client.js';
import { log } from './logger.js';

export interface CallLLMInput {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  /**
   * Qué mock devolver cuando no hay DEEPSEEK_API_KEY.
   *
   * El mock tiene que hablar el formato que espera cada llamador: el del RAG
   * emite `[cita:N]`, el de crónicas emite anclas `[u:N]`/`[h:N]`. Default
   * `'rag'`, para no cambiar lo que ya existía.
   */
  mockKind?: 'rag' | 'cronica';
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (cachedClient) return cachedClient;
  if (!process.env.DEEPSEEK_API_KEY) {
    return null; // modo mock
  }
  try {
    const cfg = getDeepSeekConfig();
    cachedClient = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      timeout: DEEPSEEK_TIMEOUT_MS,
      maxRetries: DEEPSEEK_MAX_RETRIES,
    });
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
  if (input.mockKind === 'cronica') return mockCronica(input.user);

  // Detectar si el user prompt tiene chunks numerados [1], [2], etc.
  const chunks = Array.from(input.user.matchAll(/\[(\d+)\] Fuente:/g));
  if (chunks.length === 0) {
    return 'No tengo contexto suficiente para responder. [cita:1]';
  }
  const firstRef = chunks[0]?.[1] ?? '1';
  return `Según las reglas de TOW [cita:${firstRef}], la respuesta se basa en el contexto cargado. Para una consulta específica, consultá la página oficial del reglamento.`;
}

/**
 * Relato mock para dev/test.
 *
 * Usa las anclas que de verdad estén en el contexto, así el pipeline de
 * validación se ejercita en serio: si devolviéramos `[u:1]` fijo, un contexto
 * sin unidades daría un falso negativo.
 */
function mockCronica(userPrompt: string): string {
  const unidades = Array.from(userPrompt.matchAll(/\[u:(\d+)\] ([^(]+) \(/g));
  const hitos = Array.from(userPrompt.matchAll(/\[h:(\d+)\]/g));
  const u1 = unidades[0];
  const u2 = unidades[1];
  const h1 = hitos[0]?.[1];

  const parrafos = [
    `El despliegue no dejó lugar a sutilezas: las dos líneas quedaron a tiro y el primer turno se fue en acomodar flancos.`,
    u1
      ? `${u1[2]?.trim()} [u:${u1[1]}] cargó primero y marcó el ritmo de la partida${h1 ? ` [h:${h1}]` : ''}.`
      : `Ninguna unidad quedó registrada en el parte, así que del choque solo sabemos el resultado.`,
    u2
      ? `Del otro lado, ${u2[2]?.trim()} [u:${u2[1]}] aguantó lo que pudo antes de ceder terreno.`
      : `El registro no guardó movimientos del rival.`,
    `Para el cierre ya no quedaba nadie con ganas de otra ronda. La mesa se levantó con el resultado que quedó anotado.`,
  ];

  return parrafos.join('\n\n');
}

/** Reset cache (tests). */
export function resetLLMClient(): void {
  cachedClient = null;
}