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

import { sql } from 'drizzle-orm';

import { db, isDbHealthy, toRows } from './db/client.js';
import { kbChunks, specialRules, magicItems, units } from './db/schema/kb.js';
import { getEmbeddingProvider } from './lib/embeddings.js';
import { log } from './lib/logger.js';
import type { NewKBChunk } from './db/schema/kb.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_RAIZ = resolve(__dirname, '../../../data');
const DATA_PROCESSED = join(DATA_RAIZ, 'processed');
const DATA_TRANSLATED = join(DATA_RAIZ, 'translated');

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
  /** Presentes solo si corrió el paso de traducción. */
  nameEs?: string;
  textEs?: string;
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
  nameEs?: string;
  textEs?: string;
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

/**
 * `--allow-missing` hace que la ausencia del corpus no sea un error.
 *
 * Lo usa el CI: `data/processed/` está gitignored (doc/Sources.md: el contenido
 * scrapeado no se redistribuye), así que en el runner no existe. Sin el flag,
 * el seed falla fuerte, que es lo que querés en tu máquina.
 */
const PERMITE_FALTANTE = process.argv.includes('--allow-missing');

/**
 * Lee un archivo del corpus, prefiriendo la versión traducida.
 *
 * `data/translated/` solo existe si corrió el paso de traducción, que necesita
 * DEEPSEEK_API_KEY. Sin él se siembra el corpus en inglés y las columnas
 * name_es/description_es quedan en null; el Codex muestra el inglés y lo dice.
 */
function leerCorpus<T>(archivo: string): T[] | null {
  const traducido = join(DATA_TRANSLATED, archivo);
  const ingles = join(DATA_PROCESSED, archivo);
  const ruta = existsSync(traducido) ? traducido : ingles;

  if (!existsSync(ruta)) {
    if (PERMITE_FALTANTE) {
      log.warn(`Falta ${archivo}; seed omitido (--allow-missing).`);
      return null;
    }
    log.error(`Falta ${ruta}. Corré primero: npm run rules:sync`);
    process.exit(1);
  }
  if (ruta === ingles) log.warn(`${archivo}: sin traducción, se siembra en inglés.`);
  return JSON.parse(readFileSync(ruta, 'utf-8')) as T[];
}

/** El español, o null si no se tradujo. Nunca el inglés disfrazado. */
function es(traducido: string | undefined, original: string): string | null {
  const v = traducido?.trim();
  return v && v !== original.trim() ? v : null;
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
  // El corpus se chequea antes que la DB: si no hay nada que sembrar, no hace
  // falta base para saberlo.
  const reglasOpt = leerCorpus<CorpusRule>('rules.json');
  const itemsOpt = leerCorpus<CorpusItem>('magic-items.json');
  const unidadesOpt = leerCorpus<CorpusUnit>('units.json');

  if (!reglasOpt || !itemsOpt || !unidadesOpt) {
    log.warn('Sin corpus en data/processed/: no hay nada que sembrar. Salgo sin error.');
    process.exit(0);
  }
  const reglas = reglasOpt;
  const items = itemsOpt;
  const unidades = unidadesOpt;

  log.info(
    `Corpus: ${reglas.length} reglas · ${items.length} items · ${unidades.length} unidades`,
  );

  if (!(await isDbHealthy())) {
    log.error('Database no disponible. Corré `npm run db:up` primero.');
    process.exit(1);
  }

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
      nameEs: es(r.nameEs, r.name),
      descriptionEs: es(r.textEs, r.text),
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
      nameEs: es(i.nameEs, i.name),
      descriptionEs: es(i.textEs, i.text),
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

  // El oráculo responde en español y las preguntas vienen en español, así que
  // el chunk indexa la traducción cuando existe. El nombre va siempre en
  // inglés además: es como figura en el reglamento y en las listas de ejército.
  for (const r of reglas) {
    const cuerpo = r.textEs?.trim() || r.text;
    await agregar(`chunk-${r.id}`, 'rule', r.id, r.name, `${r.name}. ${cuerpo}`, null);
  }

  for (const i of items) {
    const costo = i.cost > 0 ? ` Costo: ${i.cost} puntos.` : '';
    const cuerpo = i.textEs?.trim() || i.text;
    await agregar(`chunk-${i.id}`, 'item', i.id, i.name, `${i.name}.${costo} ${cuerpo}`, null);
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

  // El seed no puede declarar éxito sobre una tabla sin vectores.
  //
  // `embedding_vec` la llena el trigger de pgvector a partir del JSON. Si el
  // trigger no puede castear —el caso típico es OPENAI_API_KEY seteada, que da
  // 1536 dimensiones contra una columna vector(384)— la fila entra igual con la
  // columna en NULL. Después el retrieval filtra IS NOT NULL, matchea cero, y
  // el oráculo contesta "no tengo información suficiente" a todo, con el seed
  // habiendo salido 0 y la tabla mostrando 3700 filas.
  const [sinVector] = toRows(
    await db.execute(sql`select count(*)::int as n from kb_chunks where embedding_vec is null`),
  ) as Array<{ n: number }>;

  if (sinVector && sinVector.n > 0) {
    log.error(
      `${sinVector.n} de ${chunks.length} chunks quedaron sin embedding_vec. ` +
        'El oráculo no va a encontrar nada. Revisá que pgvector esté instalado ' +
        'y que OPENAI_API_KEY NO esté seteada (ver .env.production.example).',
    );
    process.exit(1);
  }

  log.info(
    `✓ Seed completo: ${reglas.length} reglas, ${items.length} items, ${unidades.length} unidades, ${chunks.length} chunks.`,
  );
  process.exit(0);
}

main().catch((err) => {
  log.error('Seed failed', { error: (err as Error).message });
  process.exit(1);
});
