/**
 * Seed de la Knowledge Base: carga el corpus a Postgres.
 *
 * Lee `data/processed/` (lo que produce `npm run rules:sync`) y puebla:
 *   special_rules · magic_items · units   — el Codex navegable
 *   kb_chunks                             — el índice del oráculo (RAG)
 *
 * ── Por qué esto cambió en la Ola 11 ─────────────────────────────────────
 *
 * Hasta acá el seed escribía SOLO en kb_chunks, a partir de 9 unidades y 5
 * reglas hardcodeadas en el código. Las tablas special_rules, magic_items y
 * units existían desde la Ola 2 y nunca se poblaron: por eso
 * `/api/rules/search` devolvía listas vacías aunque la DB estuviera sana.
 *
 * Uso:
 *   npm run kb:seed -w @dobleuno/server
 *
 * Requiere haber corrido antes el pipeline (`npm run rules:sync`), que además
 * valida el corpus antes de dejarlo pasar.
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { db, isDbHealthy } from './db/client.js';
import { kbChunks, specialRules, magicItems, units } from './db/schema/kb.js';
import { getEmbeddingProvider } from './lib/embeddings.js';
import { log } from './lib/logger.js';
import type { NewKBChunk } from './db/schema/kb.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PROCESSED = resolve(__dirname, '../../../data/processed');

/** Cuántas filas por INSERT. El corpus son miles de entradas. */
const BATCH = 100;

// ─── Shape del corpus (lo que escribe scripts/parse-tow.ts) ───────────────

interface Fuente {
  page: string;
  url: string;
  lastVerified: string;
}

interface CorpusRule {
  id: string;
  slug: string;
  name: string;
  ruleType: string;
  associations: string[];
  text: string;
  related: string[];
  source: Fuente;
}

interface CorpusItem {
  id: string;
  slug: string;
  name: string;
  type: string;
  cost: number;
  itemTypes: string[];
  associations: string[];
  text: string;
  source: Fuente;
}

interface CorpusUnit {
  id: string;
  slug: string;
  name: string;
  nameSingular: string;
  army: string;
  associations: string[];
  unitCategory: string;
  troopTypes: string[];
  profile: Array<Record<string, string>>;
  baseSize: string;
  unitSize: string;
  cost: number | null;
  costOverride: string;
  armourValue: string;
  equipment: string;
  specialRules: string;
  options: string;
  source: Fuente;
}

function leerCorpus<T>(archivo: string): T[] {
  const ruta = join(DATA_PROCESSED, archivo);
  if (!existsSync(ruta)) {
    log.error(`Falta ${ruta}. Corré primero: npm run rules:sync`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(ruta, 'utf-8')) as T[];
}

/** Inserta en tandas: un INSERT de miles de filas revienta el statement. */
async function insertarEnTandas<T>(
  tabla: Parameters<typeof db.insert>[0],
  filas: T[],
): Promise<void> {
  for (let i = 0; i < filas.length; i += BATCH) {
    await db.insert(tabla).values(filas.slice(i, i + BATCH) as never);
  }
}

/** Texto de un perfil para búsqueda: "M4 WS3 BS3 S3 …". */
function perfilATexto(profile: Array<Record<string, string>>): string {
  return profile
    .map((p) => {
      const nombre = p.Name ? `${p.Name}: ` : '';
      const stats = Object.entries(p)
        .filter(([k]) => k !== 'Name')
        .map(([k, v]) => `${k}${v}`)
        .join(' ');
      return `${nombre}${stats}`;
    })
    .join(' · ');
}

async function main(): Promise<void> {
  if (!(await isDbHealthy())) {
    log.error('Database no disponible. Corré `npm run db:up` primero.');
    process.exit(1);
  }

  const reglas = leerCorpus<CorpusRule>('rules.json');
  const items = leerCorpus<CorpusItem>('magic-items.json');
  const unidades = leerCorpus<CorpusUnit>('units.json');
  log.info(
    `Corpus: ${reglas.length} reglas · ${items.length} items · ${unidades.length} unidades`,
  );

  const provider = getEmbeddingProvider();
  log.info(`Embeddings con provider: ${provider.name} (${provider.dims} dims)`);

  // ─── Tablas del Codex ───────────────────────────────────────────────────
  // Se reemplaza el contenido entero: el corpus es la fuente de verdad, y una
  // entrada que el sitio borró no debería sobrevivir acá.
  await db.delete(specialRules);
  await db.delete(magicItems);
  await db.delete(units);

  await insertarEnTandas(
    specialRules,
    reglas.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.text,
      ruleType: r.ruleType,
      associations: r.associations,
      related: r.related,
      sourcePage: r.source.page,
      sourceUrl: r.source.url,
      searchText: `${r.name} ${r.text}`.toLowerCase(),
    })),
  );
  log.info(`✓ special_rules: ${reglas.length}`);

  await insertarEnTandas(
    magicItems,
    items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      type: i.type,
      cost: i.cost,
      description: i.text,
      itemTypes: i.itemTypes,
      associations: i.associations,
      sourcePage: i.source.page,
      sourceUrl: i.source.url,
      searchText: `${i.name} ${i.text}`.toLowerCase(),
    })),
  );
  log.info(`✓ magic_items: ${items.length}`);

  await insertarEnTandas(
    units,
    unidades.map((u) => ({
      id: u.id,
      slug: u.slug,
      name: u.name,
      nameSingular: u.nameSingular,
      army: u.army,
      associations: u.associations,
      unitCategory: u.unitCategory,
      troopTypes: u.troopTypes,
      profile: u.profile,
      baseSize: u.baseSize,
      unitSize: u.unitSize,
      cost: u.cost,
      costOverride: u.costOverride,
      armourValue: u.armourValue,
      equipment: u.equipment,
      specialRules: u.specialRules,
      options: u.options,
      sourcePage: u.source.page,
      sourceUrl: u.source.url,
      searchText: `${u.name} ${u.army} ${perfilATexto(u.profile)} ${u.specialRules}`.toLowerCase(),
    })),
  );
  log.info(`✓ units: ${unidades.length}`);

  // ─── Chunks para el oráculo ─────────────────────────────────────────────
  await db.delete(kbChunks);

  const chunks: NewKBChunk[] = [];
  const agregar = async (
    id: string,
    source: NewKBChunk['source'],
    ref: string,
    title: string,
    text: string,
    faction: string | null,
  ): Promise<void> => {
    if (!text.trim()) return;
    chunks.push({ id, source, ref, title, text, faction, embedding: JSON.stringify(await provider.embed(text)) });
  };

  for (const r of reglas) {
    await agregar(`chunk-${r.id}`, 'rule', r.id, r.name, `${r.name}. ${r.text}`, null);
  }

  for (const i of items) {
    const costo = i.cost > 0 ? ` Costo: ${i.cost} puntos.` : '';
    await agregar(`chunk-${i.id}`, 'item', i.id, i.name, `${i.name}.${costo} ${i.text}`, null);
  }

  for (const u of unidades) {
    const perfil = perfilATexto(u.profile);
    const costo = u.cost !== null ? ` Costo: ${u.cost} puntos.` : '';
    await agregar(
      `chunk-${u.id}-perfil`,
      'unit',
      u.id,
      `${u.name} — Perfil`,
      `${u.name} (${u.army}, ${u.unitCategory}). ${perfil}.${costo}`,
      u.army || null,
    );
    if (u.specialRules.trim() || u.equipment.trim()) {
      await agregar(
        `chunk-${u.id}-reglas`,
        'unit',
        u.id,
        `${u.name} — Equipo y reglas`,
        `${u.name}. Equipo: ${u.equipment}. Reglas especiales: ${u.specialRules}`,
        u.army || null,
      );
    }
  }

  log.info(`Insertando ${chunks.length} chunks…`);
  await insertarEnTandas(kbChunks, chunks);

  log.info(
    `✓ Seed completo: ${reglas.length} reglas, ${items.length} items, ${unidades.length} unidades, ${chunks.length} chunks.`,
  );
  process.exit(0);
}

main().catch((err) => {
  log.error('Seed failed', { error: (err as Error).message });
  process.exit(1);
});
