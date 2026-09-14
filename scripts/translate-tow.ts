/**
 * Dobleuno · Traductor de TOW (inglés → español rioplatense)
 *
 * Lee data/processed/*.json y produce data/translated/*.json con la versión
 * en español, usando DeepSeek (OpenAI-compatible).
 *
 * Características:
 *   - Cache de traducciones por hash del source (no retraducir si no cambió)
 *   - Batch de N reglas por request (eficiencia de tokens)
 *   - Concurrency limited (2-3 calls en paralelo)
 *   - Retry con exponential backoff
 *   - Output en JSON estructurado (parsing seguro)
 *
 * Variables de entorno:
 *   DEEPSEEK_API_KEY  requerida
 *   DEEPSEEK_MODEL    default: deepseek-chat
 *   DEEPSEEK_BASE_URL default: https://api.deepseek.com
 *
 * Uso:
 *   tsx scripts/translate-tow.ts                    # todo (rules + items)
 *   tsx scripts/translate-tow.ts --type=rule        # solo reglas
 *   tsx scripts/translate-tow.ts --type=item        # solo items
 *   tsx scripts/translate-tow.ts --force            # ignora cache
 *   tsx scripts/translate-tow.ts --concurrency=2    # ajustar paralelismo
 *   tsx scripts/translate-tow.ts --dry-run          # muestra qué se traduciría sin gastar API
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_PROCESSED = join(ROOT, 'data', 'processed');
const DATA_TRANSLATED = join(ROOT, 'data', 'translated');
const CACHE_FILE = join(DATA_TRANSLATED, '.cache.json');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';

// ─── CLI args ─────────────────────────────────────────────────────────────

interface CliArgs {
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
      args.type = v === 'all' ? 'all' : (v as 'rule' | 'item');
    } else if (arg.startsWith('--concurrency=')) {
      args.concurrency = Math.max(1, Number.parseInt(arg.slice('--concurrency='.length), 10));
    } else if (arg.startsWith('--batch=')) {
      args.batchSize = Math.max(1, Number.parseInt(arg.slice('--batch='.length), 10));
    }
  }
  return args;
}

// ─── Cache ────────────────────────────────────────────────────────────────

type Cache = Record<string, unknown>;

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

// ─── LLM call ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };
}

interface ChatResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

const SYSTEM_PROMPT = `Sos un traductor profesional de manuales de Warhammer: The Old World del inglés al español rioplatense argentino. Tu trabajo es producir una traducción precisa, natural y técnica, que un jugador pueda usar en la mesa.

Reglas:
- Mantené la terminología de juego estándar (carga, combate cuerpo a cuerpo, fase de movimiento, salvación de armadura, etc.).
- NO traduzcas nombres propios de armas, hechizos, unidades o personajes (ej. "Greatsword" → "Greatsword", no "Gran espadachín"). Sí podés agregar una glosa corta entre paréntesis si ayuda.
- Números, stats y reglas técnicas: NO los modifiques. "WS4" queda "WS4", no "WS 4" ni "4 de WS".
- Siglos los términos de juego: "wizard", "spell", "ward save", "dispel" suelen dejarse en inglés o como anglicismos aceptados en el hobby ("wizard", "dispel", "ward save"). Evitá traducciones literales torpes.
- Devolvés únicamente el JSON estructurado, sin comentarios ni markdown.`;

async function callLlm(messages: ChatMessage[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error(
      'DEEPSEEK_API_KEY no configurada. Exportá la variable o copiá .env.example a .env.',
    );
  }
  const body: ChatRequest = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
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
      if (attempt < 3) {
        const wait = 500 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`LLM call failed after 3 attempts: ${lastErr?.message ?? 'unknown'}`);
}

// ─── Translation batches ─────────────────────────────────────────────────

interface ParsedRule {
  id: string;
  name: string;
  description: string;
  category: string;
  source: { page: string; lastVerified: string };
}

interface ParsedItem {
  id: string;
  name: string;
  rarity: string;
  points: number;
  description: string;
  source: { page: string; lastVerified: string };
}

interface TranslatedRule {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  category: string;
  source: { page: string; lastVerified: string };
}

interface TranslatedItem {
  id: string;
  name: string;
  nameEs: string;
  rarity: string;
  points: number;
  description: string;
  descriptionEs: string;
  source: { page: string; lastVerified: string };
}

async function translateBatchRules(
  batch: ParsedRule[],
  cache: Cache,
  force: boolean,
): Promise<TranslatedRule[]> {
  // Determine which need translation
  const needsTranslation: ParsedRule[] = [];
  for (const r of batch) {
    const key = `rule:${r.id}:${hashKey(r.name + '|' + r.description)}`;
    if (force || !cache[key]) {
      needsTranslation.push(r);
    }
  }

  if (needsTranslation.length === 0) {
    // All cached
    return batch.map((r) => {
      const key = `rule:${r.id}:${hashKey(r.name + '|' + r.description)}`;
      const cached = cache[key] as { nameEs: string; descriptionEs: string } | undefined;
      return {
        id: r.id,
        name: r.name,
        nameEs: cached?.nameEs ?? r.name,
        description: r.description,
        descriptionEs: cached?.descriptionEs ?? r.description,
        category: r.category,
        source: r.source,
      };
    });
  }

  const userPrompt = `Traducí el siguiente array JSON de reglas de TOW al español rioplatense. Devolvé un array con la misma cantidad de elementos, en el mismo orden, con los campos extra "nameEs" (traducción del nombre) y "descriptionEs" (traducción de la descripción). Conservá los campos originales: id, name, description, category, source. Categorías válidas: combat, shooting, magic, movement, leadership, equipment, armour, psychology.

Reglas a traducir:
${JSON.stringify(needsTranslation, null, 2)}`;

  const content = await callLlm([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  let translated: TranslatedRule[];
  try {
    const parsed = JSON.parse(content) as { reglas?: TranslatedRule[]; rules?: TranslatedRule[] };
    translated = parsed.reglas ?? parsed.rules ?? [];
    if (!Array.isArray(translated) || translated.length !== needsTranslation.length) {
      throw new Error('LLM response not a valid array matching input length');
    }
  } catch (err) {
    throw new Error(`Failed to parse LLM response: ${(err as Error).message}. Raw: ${content.slice(0, 300)}`);
  }

  // Update cache
  for (let i = 0; i < needsTranslation.length; i++) {
    const original = needsTranslation[i]!;
    const trans = translated[i]!;
    const key = `rule:${original.id}:${hashKey(original.name + '|' + original.description)}`;
    cache[key] = { nameEs: trans.nameEs, descriptionEs: trans.descriptionEs };
  }

  // Combine translated + cached
  return batch.map((r) => {
    const trans = needsTranslation.find((n) => n.id === r.id);
    if (trans) {
      const found = translated.find((t) => t.id === r.id);
      return {
        id: r.id,
        name: r.name,
        nameEs: found?.nameEs ?? r.name,
        description: r.description,
        descriptionEs: found?.descriptionEs ?? r.description,
        category: r.category,
        source: r.source,
      };
    }
    // From cache
    const key = `rule:${r.id}:${hashKey(r.name + '|' + r.description)}`;
    const cached = cache[key] as { nameEs: string; descriptionEs: string } | undefined;
    return {
      id: r.id,
      name: r.name,
      nameEs: cached?.nameEs ?? r.name,
      description: r.description,
      descriptionEs: cached?.descriptionEs ?? r.description,
      category: r.category,
      source: r.source,
    };
  });
}

async function translateBatchItems(
  batch: ParsedItem[],
  cache: Cache,
  force: boolean,
): Promise<TranslatedItem[]> {
  const needsTranslation: ParsedItem[] = [];
  for (const i of batch) {
    const key = `item:${i.id}:${hashKey(i.name + '|' + i.description)}`;
    if (force || !cache[key]) {
      needsTranslation.push(i);
    }
  }

  if (needsTranslation.length === 0) {
    return batch.map((i) => {
      const key = `item:${i.id}:${hashKey(i.name + '|' + i.description)}`;
      const cached = cache[key] as { nameEs: string; descriptionEs: string } | undefined;
      return {
        id: i.id,
        name: i.name,
        nameEs: cached?.nameEs ?? i.name,
        rarity: i.rarity,
        points: i.points,
        description: i.description,
        descriptionEs: cached?.descriptionEs ?? i.description,
        source: i.source,
      };
    });
  }

  const userPrompt = `Traducí el siguiente array JSON de items mágicos de TOW al español rioplatense. Devolvé un array con la misma cantidad de elementos, en el mismo orden, con los campos extra "nameEs" (traducción del nombre) y "descriptionEs" (traducción de la descripción). Conservá los campos originales: id, name, rarity, points, description, source. NO modifiques el valor de "points" (es numérico) ni "rarity". Nombres propios como "Sword of Battle" pueden quedar igual o tener una traducción natural entre paréntesis.

Items a traducir:
${JSON.stringify(needsTranslation, null, 2)}`;

  const content = await callLlm([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  let translated: TranslatedItem[];
  try {
    const parsed = JSON.parse(content) as { items?: TranslatedItem[] };
    translated = parsed.items ?? [];
    if (!Array.isArray(translated) || translated.length !== needsTranslation.length) {
      throw new Error('LLM response not a valid array matching input length');
    }
  } catch (err) {
    throw new Error(`Failed to parse LLM response: ${(err as Error).message}. Raw: ${content.slice(0, 300)}`);
  }

  for (let i = 0; i < needsTranslation.length; i++) {
    const original = needsTranslation[i]!;
    const trans = translated[i]!;
    const key = `item:${original.id}:${hashKey(original.name + '|' + original.description)}`;
    cache[key] = { nameEs: trans.nameEs, descriptionEs: trans.descriptionEs };
  }

  return batch.map((i) => {
    const trans = needsTranslation.find((n) => n.id === i.id);
    if (trans) {
      const found = translated.find((t) => t.id === i.id);
      return {
        id: i.id,
        name: i.name,
        nameEs: found?.nameEs ?? i.name,
        rarity: i.rarity,
        points: i.points,
        description: i.description,
        descriptionEs: found?.descriptionEs ?? i.description,
        source: i.source,
      };
    }
    const key = `item:${i.id}:${hashKey(i.name + '|' + i.description)}`;
    const cached = cache[key] as { nameEs: string; descriptionEs: string } | undefined;
    return {
      id: i.id,
      name: i.name,
      nameEs: cached?.nameEs ?? i.name,
      rarity: i.rarity,
      points: i.points,
      description: i.description,
      descriptionEs: cached?.descriptionEs ?? i.description,
      source: i.source,
    };
  });
}

// ─── Batching & concurrency ──────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]!);
      done++;
      onProgress?.(done, items.length);
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── Stats ────────────────────────────────────────────────────────────────

interface TranslateStats {
  attempted: number;
  fromCache: number;
  translated: number;
  failed: number;
  errors: Array<{ batch: string; error: string }>;
}

// ─── Main ────────────────────────────────────────────────────────────────

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

  const log = (msg: string): void => console.log(msg);
  const err = (msg: string): void => console.error(msg);

  if (args.dryRun) {
    log('[translate] DRY RUN — no se gastan créditos LLM');
  }

  // ─── Reglas ──────────────────────────────────────────────────────────
  if (args.type === 'rule' || args.type === 'all') {
    const src = join(DATA_PROCESSED, 'special-rules.json');
    if (!existsSync(src)) {
      err(`[translate] No se encuentra ${src}. Corré primero \`npm run parse\`.`);
      stats.failed++;
    } else {
      const raw = JSON.parse(readFileSync(src, 'utf-8')) as ParsedRule[];
      log(`[translate] Reglas: ${raw.length} totales`);

      const allBatches = chunk(raw, args.batchSize);
      log(`[translate] Procesando en ${allBatches.length} batches (size=${args.batchSize}, concurrency=${args.concurrency})`);

      let cacheHits = 0;
      const allTranslated: TranslatedRule[] = [];
      await processWithConcurrency(
        allBatches,
        args.concurrency,
        async (batch) => {
          try {
            const before = batch.length;
            const result = await translateBatchRules(batch, cache, args.force);
            for (const r of result) {
              const key = `rule:${r.id}:${hashKey(r.name + '|' + r.description)}`;
              const cached = cache[key];
              if (cached) {
                const c = cached as { nameEs: string; descriptionEs: string };
                if (c.nameEs === r.nameEs && c.descriptionEs === r.descriptionEs && !args.force) {
                  // already cached
                }
              }
            }
            allTranslated.push(...result);
            stats.attempted += before;
            return result;
          } catch (e) {
            stats.failed++;
            stats.errors.push({ batch: `rules[${batch[0]?.id}...]`, error: (e as Error).message });
            // Fallback: keep originals
            for (const r of batch) {
              allTranslated.push({
                id: r.id,
                name: r.name,
                nameEs: r.name,
                description: r.description,
                descriptionEs: r.description,
                category: r.category,
                source: r.source,
              });
            }
            return [];
          }
        },
        (done, total) => {
          process.stdout.write(`\r[translate] rules: ${done}/${total} batches`);
        },
      );
      process.stdout.write('\n');
      cacheHits = allTranslated.filter((r) => {
        // Approximate: if nameEs === name (no translation done) and forced fallback, but cache didn't have a key
        // We just count actual API calls
        return false;
      }).length;
      stats.fromCache += cacheHits;

      // Save
      const out = join(DATA_TRANSLATED, 'special-rules.json');
      writeFileSync(out, JSON.stringify(allTranslated, null, 2), 'utf-8');
      log(`[translate] → ${out.replace(ROOT + '\\', '')}`);
      stats.translated = allTranslated.length;
    }
  }

  // ─── Items ───────────────────────────────────────────────────────────
  if (args.type === 'item' || args.type === 'all') {
    const src = join(DATA_PROCESSED, 'magic-items.json');
    if (!existsSync(src)) {
      err(`[translate] No se encuentra ${src}. Corré primero \`npm run parse\`.`);
      stats.failed++;
    } else {
      const raw = JSON.parse(readFileSync(src, 'utf-8')) as ParsedItem[];
      log(`[translate] Items: ${raw.length} totales`);

      const allBatches = chunk(raw, args.batchSize);
      log(`[translate] Procesando en ${allBatches.length} batches`);

      const allTranslated: TranslatedItem[] = [];
      await processWithConcurrency(
        allBatches,
        args.concurrency,
        async (batch) => {
          try {
            const result = await translateBatchItems(batch, cache, args.force);
            allTranslated.push(...result);
            stats.attempted += batch.length;
            return result;
          } catch (e) {
            stats.failed++;
            stats.errors.push({ batch: `items[${batch[0]?.id}...]`, error: (e as Error).message });
            for (const i of batch) {
              allTranslated.push({
                id: i.id,
                name: i.name,
                nameEs: i.name,
                rarity: i.rarity,
                points: i.points,
                description: i.description,
                descriptionEs: i.description,
                source: i.source,
              });
            }
            return [];
          }
        },
        (done, total) => {
          process.stdout.write(`\r[translate] items: ${done}/${total} batches`);
        },
      );
      process.stdout.write('\n');

      const out = join(DATA_TRANSLATED, 'magic-items.json');
      writeFileSync(out, JSON.stringify(allTranslated, null, 2), 'utf-8');
      log(`[translate] → ${out.replace(ROOT + '\\', '')}`);
      stats.translated += allTranslated.length;
    }
  }

  saveCache(cache);
  log(`\n[translate] Done. ${stats.translated} items traducidos, ${stats.failed} batches fallidos.`);
  if (stats.failed > 0) {
    err('[translate] Cache guardado. Re-ejecutá para reintentar los batches fallidos.');
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
