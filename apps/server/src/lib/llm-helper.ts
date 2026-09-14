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

/**
 * Presupuesto por defecto.
 *
 * Eran 600, dimensionados para un modelo sin razonamiento. Los modelos actuales
 * de DeepSeek descuentan los tokens de razonamiento de este mismo número, y en
 * una consulta de reglas eso son ~850-1200 antes de escribir una sola palabra
 * de la respuesta. Medido contra la API: con 600 el contenido vuelve vacío;
 * con 1500 la respuesta sale completa.
 */
const MAX_TOKENS_DEFAULT = 2000;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (cachedClient) return cachedClient;
  if (!process.env.DEEPSEEK_API_KEY) {
    // En producción, nunca. El mock devuelve prosa plausible con citas
    // inventadas y HTTP 200: es indistinguible de una respuesta real para el
    // usuario y para cualquier verificación automática, incluida la nuestra.
    // Sin este guard, una ola puede cerrar declarando "oráculo verificado"
    // siendo falso.
    //
    // Es redundante con el schema de env.ts, que ya exige la key en
    // producción. La redundancia es deliberada: el costo de equivocarse acá es
    // que la app mienta sobre el reglamento.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DEEPSEEK_API_KEY no configurada. En producción no se usa el mock: ' +
          'devolvería respuestas inventadas con apariencia de reales.',
      );
    }
    return null; // modo mock, sólo dev y test
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
      max_tokens: input.maxTokens ?? MAX_TOKENS_DEFAULT,
    });

    const choice = res.choices[0];
    const texto = choice?.message?.content ?? '';

    // Una respuesta vacía no se devuelve como si fuera una respuesta.
    //
    // Los modelos de razonamiento de DeepSeek gastan del MISMO presupuesto de
    // `max_tokens` para pensar: en una pregunta simple de reglas, el
    // razonamiento se lleva entre 850 y 1200 tokens. Con los 600 que pedía
    // este helper, `finish_reason` volvía "length", `reasoning_tokens` daba
    // 600 de 600 y `content` llegaba VACÍO — con HTTP 200.
    //
    // Devolver ese '' hacía que el oráculo contestara con una respuesta en
    // blanco y cero citas, sin que nada fallara. Es el mismo modo de falla que
    // la Ola 12 vino persiguiendo, así que acá se corta.
    if (!texto.trim()) {
      const razon = choice?.finish_reason ?? 'desconocido';
      throw new Error(
        `El modelo devolvió una respuesta vacía (finish_reason: ${razon}). ` +
          (razon === 'length'
            ? 'El presupuesto de tokens se consumió razonando: subí maxTokens.'
            : 'Reintentá; si persiste, revisá el prompt.'),
      );
    }
    return texto;
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