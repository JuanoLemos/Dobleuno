/**
 * Ola 7.1 — Ingest: lee data/processed/*.json y popula kb_chunks.
 *
 * Lee los JSON producidos por parse-tow.ts (units-empire.json, units-bretonnia.json,
 * special-rules.json, magic-items.json), genera 1-3 chunks por item, calcula su
 * embedding con el provider activo (deterministic si OPENAI_API_KEY está vacío),
 * y los inserta en la tabla kb_chunks.
 *
 * El `ingest_log` se mantiene en kb-sync.ts (orquestador) — este archivo solo
 * se ocupa de la transformación processed → chunks.
 *
 * Uso standalone:
 *   tsx src/lib/kb-ingest.ts
 *
 * Uso programático:
 *   import { ingestProcessedFiles } from './kb-ingest.js';
 *   const stats = await ingestProcessedFiles({ processedDir: 'data/processed' });
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, isDbHealthy } from '../db/client.js';
import { kbChunks } from '../db/schema/kb.js';
import { getEmbeddingProvider } from './embeddings.js';
import { log } from './logger.js';
import type { NewKBChunk } from '../db/schema/kb.js';

// ─── Tipos parciales — solo lo que necesitamos de los JSON del parser ──────

interface ParsedWeapon {
  name: string;
  strength: number;
  armorPenetration: number;
}
interface ParsedUnit {
  id: string;
  faction: string;
  category: string;
  name: string;
  stats: {
    M: number;
    WS: number;
    BS: number;
    S: number;
    T: number;
    W: number;
    I: number;
    A: number;
    Ld: number;
    Sv: string;
  };
  weapons: ParsedWeapon[];
  specialRules: string[];
  pointsPerModel?: number;
}
interface ParsedSpecialRule {
  id: string;
  name: string;
  text: string;
}
interface ParsedMagicItem {
  id: string;
  name: string;
  rarity: string;
  points: number;
  description: string;
}

export interface IngestStats {
  filesProcessed: number;
  chunksCreated: number;
  failed: number;
  errors: string[];
}

export interface IngestOptions {
  processedDir: string;
  silent?: boolean;
  /** Si true, no borra los chunks existentes antes de insertar. */
  append?: boolean;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function ingestProcessedFiles(opts: IngestOptions): Promise<IngestStats> {
  const silent = opts.silent ?? false;
  const logFn = silent ? () => undefined : (m: string) => log.info(m);
  const errFn = silent ? () => undefined : (m: string) => log.error(m);
  const stats: IngestStats = { filesProcessed: 0, chunksCreated: 0, failed: 0, errors: [] };

  if (!(await isDbHealthy())) {
    throw new Error('Database no disponible. Corré `npm run db:up` primero.');
  }

  const files = readdirSync(opts.processedDir).filter((f) => f.endsWith('.json'));
  logFn(`[ingest] Procesando ${files.length} archivos en ${opts.processedDir}`);

  const provider = getEmbeddingProvider();
  logFn(`[ingest] Embeddings provider: ${provider.name} (${provider.dims} dims)`);

  const allChunks: NewKBChunk[] = [];

  for (const file of files) {
    stats.filesProcessed++;
    const fullPath = join(opts.processedDir, file);
    try {
      // El JSON.parse devuelve `any` por diseño; los discriminamos por nombre de archivo.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const content = JSON.parse(readFileSync(fullPath, 'utf-8'));

      if (file.startsWith('units-')) {
        // array de unidades
        for (const unit of content as ParsedUnit[]) {
          await pushUnitChunks(unit, provider, allChunks);
        }
      } else if (file === 'special-rules.json') {
        for (const rule of content as ParsedSpecialRule[]) {
          await pushRuleChunk(rule, provider, allChunks);
        }
      } else if (file === 'magic-items.json') {
        for (const item of content as ParsedMagicItem[]) {
          await pushItemChunk(item, provider, allChunks);
        }
      } else {
        logFn(`[ingest]   (skip) ${file}: formato desconocido`);
      }
    } catch (e) {
      stats.failed++;
      const msg = `${file}: ${(e as Error).message}`;
      stats.errors.push(msg);
      errFn(`[ingest]   [fail] ${msg}`);
    }
  }

  if (!opts.append) {
    logFn(`[ingest] Limpiando kb_chunks existentes…`);
    await db.delete(kbChunks);
  }

  logFn(`[ingest] Insertando ${allChunks.length} chunks…`);
  const batchSize = 50;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    if (batch.length === 0) continue;
    await db.insert(kbChunks).values(batch);
  }

  stats.chunksCreated = allChunks.length;
  logFn(`[ingest] ✓ Ingest completo: ${stats.chunksCreated} chunks creados, ${stats.failed} archivos fallaron.`);
  return stats;
}

// ─── Chunk builders ────────────────────────────────────────────────────────

async function pushUnitChunks(
  unit: ParsedUnit,
  provider: { embed: (t: string) => Promise<number[]> },
  out: NewKBChunk[],
): Promise<void> {
  // Chunk 1: stats
  const statsText = `${unit.name} (${unit.faction}, ${unit.category}).
M${unit.stats.M} WS${unit.stats.WS} BS${unit.stats.BS} S${unit.stats.S} T${unit.stats.T} W${unit.stats.W} I${unit.stats.I} A${unit.stats.A} Ld${unit.stats.Ld} Sv${unit.stats.Sv}.
${unit.pointsPerModel ? `Coste: ${unit.pointsPerModel} pts/modelo. ` : ''}`.trim();
  const statsEmb = await provider.embed(statsText);
  out.push({
    id: `chunk-${unit.id}-stats`,
    source: 'unit',
    ref: unit.id,
    title: `${unit.name} — Stats`,
    text: statsText,
    faction: unit.faction,
    embedding: JSON.stringify(statsEmb),
  });

  // Chunk 2: weapons + special rules
  if (unit.weapons.length > 0 || unit.specialRules.length > 0) {
    const rulesText = `${unit.name}: armas ${unit.weapons.map((w) => `${w.name} (F${w.strength}, PA${w.armorPenetration})`).join(', ') || 'ninguna'}. Reglas especiales: ${unit.specialRules.join(', ') || 'ninguna'}.`;
    const rulesEmb = await provider.embed(rulesText);
    out.push({
      id: `chunk-${unit.id}-rules`,
      source: 'unit',
      ref: unit.id,
      title: `${unit.name} — Armas y reglas`,
      text: rulesText,
      faction: unit.faction,
      embedding: JSON.stringify(rulesEmb),
    });
  }
}

async function pushRuleChunk(
  rule: ParsedSpecialRule,
  provider: { embed: (t: string) => Promise<number[]> },
  out: NewKBChunk[],
): Promise<void> {
  const emb = await provider.embed(rule.text);
  out.push({
    id: `chunk-${rule.id}`,
    source: 'rule',
    ref: rule.id,
    title: rule.name,
    text: rule.text,
    faction: null,
    embedding: JSON.stringify(emb),
  });
}

async function pushItemChunk(
  item: ParsedMagicItem,
  provider: { embed: (t: string) => Promise<number[]> },
  out: NewKBChunk[],
): Promise<void> {
  const text = `${item.name} (${item.rarity}, ${item.points} pts). ${item.description}`.trim();
  const emb = await provider.embed(text);
  out.push({
    id: `chunk-${item.id}`,
    source: 'item',
    ref: item.id,
    title: item.name,
    text,
    faction: null,
    embedding: JSON.stringify(emb),
  });
}

// ─── CLI entrypoint ────────────────────────────────────────────────────────

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  const processedDir = process.argv[2] ?? 'data/processed';
  ingestProcessedFiles({ processedDir })
    .then((r) => {
      console.log(`✓ ${r.chunksCreated} chunks, ${r.failed} archivos fallaron`);
      if (r.errors.length > 0) {
        console.log('Errores:');
        r.errors.forEach((e) => console.log(`  - ${e}`));
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Ingest failed:', err);
      process.exit(1);
    });
}
