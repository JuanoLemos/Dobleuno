/**
 * Dobleuno · Traductor de TOW (inglés → español rioplatense)
 *
 * Lee data/processed/*.json y produce data/translated/*.json: las mismas
 * entradas, con `nameEs` y `textEs` agregados.
 *
 * ── Por qué se reescribió en la Ola 11 ───────────────────────────────────
 *
 * Este script leía `special-rules.json` con campos `description`, `category`,
 * `rarity` y `points`. Ese archivo y esos campos son del corpus viejo, el que
 * el mirror roto producía. El corpus nuevo es `rules.json` / `magic-items.json`
 * con `text`, `ruleType`, `type` y `cost`, así que el traductor habría fallado
 * en el primer archivo del pipeline.
 *
 * Reglas e items comparten la forma que importa acá — id, name, text — así que
 * el traductor los trata igual y solo cambia el prompt.
 *
 * Las unidades NO se traducen: su contenido es statline y bloques de equipo,
 * donde el valor está en los números y en los nombres propios, que la guía de
 * traducción manda dejar en inglés. `units.json` se copia tal cual para que el
 * corpus traducido esté completo.
 *
 * Características:
 *   - Cache por hash del source (no retraduce lo que no cambió)
 *   - Batch de N entradas por request
 *   - Concurrency limitada, retry con backoff
 *
 * Variables de entorno:
 *   DEEPSEEK_API_KEY  requerida
 *   DEEPSEEK_MODEL    default: deepseek-flash
 *   DEEPSEEK_BASE_URL default: https://api.deepseek.com
 *
 * Uso:
 *   tsx scripts/translate-tow.ts                    # reglas + items
 *   tsx scripts/translate-tow.ts --type=rule
 *   tsx scripts/translate-tow.ts --force            # ignora cache
 *   tsx scripts/translate-tow.ts --dry-run          # no gasta API
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_PROCESSED = join(ROOT, 'data', 'processed');
const DATA_TRANSLATED = join(ROOT, 'data', 'translated');
const CACHE_FILE = join(DATA_TRANSLATED, '.cache.json');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-flash';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';

// ─── CLI args ─────────────────────────────────────────────────────────────

export interface CliArgs {
  type: 'rule' | 'item' | 'all';
  force: boolean;
  concurrency: number;
  dryRun: boolean;
  batchSize: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    type: 'all',
    force: false,
    concurrency: 2,
    dryRun: false,
    batchSize: 8,
  };
  for (const arg of argv) {
    if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--type=')) {
      const v = arg.slice('--type='.length);
      args.type = v === 'rule' || v === 'item' ? v : 'all';
    } else if (arg.startsWith('--concurrency=')) {
      args.concurrency = Math.max(1, Number.parseInt(arg.slice('--concurrency='.length), 10));
    } else if (arg.startsWith('--batch=')) {
      args.batchSize = Math.max(1, Number.parseInt(arg.slice('--batch='.length), 10));
    }
  }
  return args;
}

// ─── Cache ────────────────────────────────────────────────────────────────

interface Traduccion {
  nameEs: string;
  textEs: string;
}

type Cache = Record<string, Traduccion>;

function loadCache(): Cache {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as Cache;
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  mkdirSync(DATA_TRANSLATED, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function hashKey(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

/** La clave incluye el hash del original: si el sitio corrige, se retraduce. */
function claveDe(tipo: Tipo, e: Traducible): string {
  return `${tipo}:${e.id}:${hashKey(`${e.name}|${e.text}`)}`;
}

// ─── LLM ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

const SYSTEM_PROMPT = `Sos un traductor profesional de manuales de Warhammer: The Old World del inglés al español rioplatense argentino. Tu trabajo es producir una traducción precisa, natural y técnica, que un jugador pueda usar en la mesa.

Reglas:
- Mantené la terminología de juego estándar (carga, combate cuerpo a cuerpo, fase de movimiento, salvación de armadura, etc.).
- NO traduzcas nombres propios de armas, hechizos, unidades o personajes (ej. "Greatsword" queda "Greatsword"). Sí podés agregar una glosa corta entre paréntesis si ayuda.
- Números, stats y reglas técnicas: NO los modifiques. "WS4" queda "WS4", no "WS 4" ni "4 de WS".
- Los términos "wizard", "spell", "ward save", "dispel" se dejan en inglés o como anglicismos aceptados en el hobby. Evitá traducciones literales torpes.
- Conservá los saltos de línea del original: separan el perfil del arma de su texto.
- Devolvés únicamente el JSON estructurado, sin comentarios ni markdown.`;

async function callLlm(messages: ChatMessage[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error(
      'DEEPSEEK_API_KEY no configurada. Exportá la variable o copiá .env.example a .env.',
    );
  }
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 8000,
    response_format: { type: 'json_object' as const },
  };
  let attempt = 0;
  let lastErr: Error | null = null;
  while (attempt < 3) {
    try {
      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as ChatResponse;
      return data.choices[0]?.message?.content ?? '';
    } catch (err) {
      lastErr = err as Error;
      attempt++;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw new Error(`LLM call failed after 3 attempts: ${lastErr?.message ?? 'unknown'}`);
}

// ─── Traducción ───────────────────────────────────────────────────────────

type Tipo = 'rule' | 'item';

/** Lo único que el traductor necesita de una entrada del corpus. */
interface Traducible {
  id: string;
  name: string;
  text: string;
  [k: string]: unknown;
}

const ETIQUETA: Record<Tipo, string> = {
  rule: 'reglas especiales',
  item: 'items mágicos',
};

/**
 * Traduce un lote y devuelve las traducciones indexadas por id.
 *
 * Solo manda al LLM lo que no está en cache. Si la respuesta no matchea el
 * lote, tira: mejor abortar el lote y reintentar que escribir un corpus donde
 * el texto de una regla quedó bajo el nombre de otra.
 */
async function traducirLote(
  tipo: Tipo,
  lote: Traducible[],
  cache: Cache,
  force: boolean,
): Promise<Map<string, Traduccion>> {
  const resultado = new Map<string, Traduccion>();
  const faltantes: Traducible[] = [];

  for (const e of lote) {
    const cached = force ? undefined : cache[claveDe(tipo, e)];
    if (cached) resultado.set(e.id, cached);
    else faltantes.push(e);
  }

  if (faltantes.length === 0) return resultado;

  const payload = faltantes.map((e) => ({ id: e.id, name: e.name, text: e.text }));
  const userPrompt = `Traducí al español rioplatense estas ${ETIQUETA[tipo]} de Warhammer: The Old World.

Devolvé un objeto JSON con la clave "entradas": un array con la MISMA cantidad de elementos y los MISMOS id, cada uno con:
  - "id": el id original, sin cambios
  - "nameEs": el nombre traducido (o el original si es un nombre propio)
  - "textEs": el texto traducido

Entradas:
${JSON.stringify(payload, null, 2)}`;

  const content = await callLlm([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  let entradas: Array<{ id?: string; nameEs?: string; textEs?: string }>;
  try {
    const parsed = JSON.parse(content) as {
      entradas?: Array<{ id?: string; nameEs?: string; textEs?: string }>;
    };
    entradas = parsed.entradas ?? [];
  } catch (err) {
    throw new Error(
      `Respuesta del LLM ilegible: ${(err as Error).message}. Crudo: ${content.slice(0, 300)}`,
    );
  }
  if (entradas.length !== faltantes.length) {
    throw new Error(
      `El LLM devolvió ${entradas.length} entradas para un lote de ${faltantes.length}`,
    );
  }

  // Se machea por id, no por posición: si el modelo reordena, el texto no se
  // cruza de entrada. Lo que no vuelve queda sin traducir y el validador avisa.
  const porId = new Map(entradas.filter((t) => t.id).map((t) => [t.id as string, t]));
  for (const e of faltantes) {
    const t = porId.get(e.id);
    if (!t?.textEs) continue;
    const traduccion: Traduccion = { nameEs: t.nameEs?.trim() || e.name, textEs: t.textEs };
    resultado.set(e.id, traduccion);
    cache[claveDe(tipo, e)] = traduccion;
  }

  return resultado;
}

// ─── Batching & concurrency ──────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let idx = 0;
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]!);
      done++;
      onProgress?.(done, items.length);
    }
  });
  await Promise.all(workers);
}

// ─── Stats ────────────────────────────────────────────────────────────────

export interface TranslateStats {
  attempted: number;
  fromCache: number;
  translated: number;
  failed: number;
  errors: Array<{ batch: string; error: string }>;
}

// ─── Main ────────────────────────────────────────────────────────────────

function leer(archivo: string): Traducible[] | null {
  const ruta = join(DATA_PROCESSED, archivo);
  if (!existsSync(ruta)) return null;
  return JSON.parse(readFileSync(ruta, 'utf-8')) as Traducible[];
}

async function traducirArchivo(
  tipo: Tipo,
  archivo: string,
  args: CliArgs,
  cache: Cache,
  stats: TranslateStats,
): Promise<void> {
  const entradas = leer(archivo);
  if (!entradas) {
    console.error(`[translate] No se encuentra ${archivo}. Corré primero el parse.`);
    stats.failed++;
    return;
  }

  const enCache = entradas.filter((e) => !args.force && cache[claveDe(tipo, e)]).length;
  console.log(
    `[translate] ${archivo}: ${entradas.length} entradas ` +
      `(${enCache} en cache, ${entradas.length - enCache} a traducir)`,
  );

  if (args.dryRun) {
    stats.attempted += entradas.length;
    stats.fromCache += enCache;
    return;
  }

  const traducciones = new Map<string, Traduccion>();
  const lotes = chunk(entradas, args.batchSize);

  await processWithConcurrency(
    lotes,
    args.concurrency,
    async (lote) => {
      try {
        for (const [id, t] of await traducirLote(tipo, lote, cache, args.force)) {
          traducciones.set(id, t);
        }
      } catch (e) {
        stats.failed++;
        stats.errors.push({ batch: `${tipo}[${lote[0]?.id}…]`, error: (e as Error).message });
      }
      stats.attempted += lote.length;
    },
    (done, total) => process.stdout.write(`\r[translate] ${tipo}: ${done}/${total} lotes`),
  );
  process.stdout.write('\n');

  // Lo que no se pudo traducir se escribe en inglés. El validador de
  // rules-sync corta si eso pasa en más del 10% del archivo.
  const salida = entradas.map((e) => {
    const t = traducciones.get(e.id);
    return { ...e, nameEs: t?.nameEs ?? e.name, textEs: t?.textEs ?? e.text };
  });

  writeFileSync(join(DATA_TRANSLATED, archivo), JSON.stringify(salida, null, 2), 'utf-8');
  console.log(`[translate] → data/translated/${archivo}`);
  stats.fromCache += enCache;
  stats.translated += traducciones.size;
}

export async function translateAll(args: CliArgs): Promise<TranslateStats> {
  mkdirSync(DATA_TRANSLATED, { recursive: true });

  const cache = loadCache();
  const stats: TranslateStats = {
    attempted: 0,
    fromCache: 0,
    translated: 0,
    failed: 0,
    errors: [],
  };

  if (args.dryRun) console.log('[translate] DRY RUN — no se gastan créditos LLM');

  if (args.type === 'rule' || args.type === 'all') {
    await traducirArchivo('rule', 'rules.json', args, cache, stats);
  }
  if (args.type === 'item' || args.type === 'all') {
    await traducirArchivo('item', 'magic-items.json', args, cache, stats);
  }

  // Las unidades pasan sin traducir: son statlines y nombres propios.
  const unidades = join(DATA_PROCESSED, 'units.json');
  if (existsSync(unidades) && !args.dryRun) {
    copyFileSync(unidades, join(DATA_TRANSLATED, 'units.json'));
    console.log('[translate] units.json copiado sin traducir (statlines y nombres propios)');
  }

  saveCache(cache);
  console.log(
    `\n[translate] Listo. ${stats.translated} traducidas, ` +
      `${stats.fromCache} de cache, ${stats.failed} lotes fallidos.`,
  );
  for (const e of stats.errors.slice(0, 5)) console.error(`  ${e.batch}: ${e.error}`);
  if (stats.failed > 0) {
    console.error('[translate] Cache guardado. Re-ejecutá para reintentar los lotes fallidos.');
  }
  return stats;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const stats = await translateAll(args);
  if (stats.failed > 0) process.exit(1);
}

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}
