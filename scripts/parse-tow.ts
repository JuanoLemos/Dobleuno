/**
 * Dobleuno · Parser del mirror de tow.whfb.app
 *
 * Lee los JSON de data/raw/ (que produce mirror-tow.ts) y escribe el corpus
 * normalizado en data/processed/. Valida con Zod.
 *
 * ── Qué cambió respecto de la versión anterior ───────────────────────────
 *
 * La anterior parseaba HTML con selectores CSS (`.rarity`, `.unit-category`)
 * que nunca existieron: el mirror bajaba el shell de carga de Next y el parser
 * terminaba extrayendo el <h1> del header del sitio. Ahora la entrada es el
 * JSON de Contentful que el propio sitio incrusta en la página, así que no hay
 * selectores ni heurística: se leen campos.
 *
 * ── Taxonomía: se guarda la del sitio, no una inventada ──────────────────
 *
 * El esquema viejo asumía 8 categorías de regla, 4 rarezas de item y 2
 * facciones. La realidad son 32 `ruleType`, 70 `magicItemType` y 19 ejércitos.
 * Forzar ese mapeo fue justamente lo que hizo que las 39 reglas cayeran todas
 * en `equipment`. Acá se guardan los slugs reales; si una vista necesita
 * agrupar más grueso, que lo haga con un mapeo explícito y a la vista.
 *
 * Uso:
 *   tsx scripts/parse-tow.ts              # todo lo que haya en data/raw/
 *   tsx scripts/parse-tow.ts --kind=rule  # solo un tipo
 *   tsx scripts/parse-tow.ts --verbose    # muestra las entradas que fallan
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_RAW = join(ROOT, 'data', 'raw');
const DATA_PROCESSED = join(ROOT, 'data', 'processed');

// ─── Schemas de salida ────────────────────────────────────────────────────

const FuenteSchema = z.object({
  /** Página del reglamento impreso. */
  page: z.string(),
  url: z.string(),
  lastVerified: z.string(),
});

const ParsedRuleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  /** Sección del reglamento: 'special-rules', 'the-combat-phase', … */
  ruleType: z.string(),
  /** Ejércitos o publicaciones a las que aplica. */
  associations: z.array(z.string()).default([]),
  /** Texto plano de la regla. */
  text: z.string(),
  /** Slugs de reglas relacionadas, para navegación cruzada. */
  related: z.array(z.string()).default([]),
  source: FuenteSchema,
});

const ParsedItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  /** Clasificación del sitio: 'Ability', 'Weapon', … */
  type: z.string().default(''),
  /** Costo en puntos. 0 = sin costo declarado. */
  cost: z.number().int().nonnegative().default(0),
  /** Listas de items por ejército: 'empire-of-man-magic-items-type', … */
  itemTypes: z.array(z.string()).default([]),
  associations: z.array(z.string()).default([]),
  text: z.string(),
  source: FuenteSchema,
});

/**
 * Statline. Los valores van como string a propósito: el sitio usa `-`, `(+1)`,
 * `2D6` y otras notaciones que no son números.
 */
const PerfilSchema = z.record(z.string(), z.string());

const ParsedUnitSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  nameSingular: z.string().default(''),
  /** Ejército: 'empire-of-man', 'kingdom-of-bretonnia', … */
  army: z.string().default(''),
  associations: z.array(z.string()).default([]),
  /** 'Character', 'Core', 'Special', 'Rare', … */
  unitCategory: z.string().default(''),
  troopTypes: z.array(z.string()).default([]),
  profile: z.array(PerfilSchema).default([]),
  baseSize: z.string().default(''),
  unitSize: z.string().default(''),
  cost: z.number().int().nonnegative().nullable().default(null),
  costOverride: z.string().default(''),
  armourValue: z.string().default(''),
  equipment: z.string().default(''),
  specialRules: z.string().default(''),
  options: z.string().default(''),
  source: FuenteSchema,
});

export type ParsedRule = z.infer<typeof ParsedRuleSchema>;
export type ParsedItem = z.infer<typeof ParsedItemSchema>;
export type ParsedUnit = z.infer<typeof ParsedUnitSchema>;

// ─── Rich text de Contentful → texto plano ────────────────────────────────

interface RichNode {
  nodeType?: string;
  value?: string;
  content?: RichNode[];
}

/** Contenedores: sus hijos son bloques y van en líneas separadas. */
const NODOS_CONTENEDOR = new Set([
  'document',
  'unordered-list',
  'ordered-list',
  'table',
  'table-row',
  'blockquote',
]);

/**
 * Nodos que forman una línea: sus hijos son inline y se concatenan.
 *
 * Distinguirlos importa: un párrafo con un link en el medio ("durante la
 * <link>fase de Combate</link>, el modelo…") tiene tres hijos inline. Tratarlo
 * como contenedor mete saltos de línea en mitad de la oración.
 */
const NODOS_LINEA = new Set(['paragraph', 'list-item', 'table-cell', 'table-header-cell']);

/** Campos escalares de una entrada embebida que vale la pena mostrar. */
const CAMPOS_EMBEBIDOS: Array<[string, string]> = [
  ['range', 'Alcance'],
  ['strength', 'Fuerza'],
  ['armourPiercing', 'Penetración'],
  ['cost', 'Costo'],
  ['type', 'Tipo'],
];

/**
 * Aplana una entrada embebida (`embedded-entry-block` / `-inline`).
 *
 * El caso típico es `weaponProfile`: el perfil del arma con alcance, fuerza y
 * penetración. 523 reglas del corpus embeben una entrada así, y son
 * justamente las armas — el perfil es el contenido principal, no un adorno.
 */
function embebidaAPlano(target: unknown): string {
  if (!target || typeof target !== 'object') return '';
  const fields = (target as { fields?: Record<string, unknown> }).fields;
  if (!fields) return '';

  const partes: string[] = [];
  if (typeof fields.name === 'string') partes.push(fields.name);

  const escalares = CAMPOS_EMBEBIDOS.filter(([k]) => {
    const v = fields[k];
    return typeof v === 'string' || typeof v === 'number';
  }).map(([k, etiqueta]) => `${etiqueta} ${String(fields[k])}`);
  if (escalares.length > 0) partes.push(escalares.join(', '));

  // Sub-documentos (specialRules del perfil, por ejemplo).
  for (const [k, v] of Object.entries(fields)) {
    if (CAMPOS_EMBEBIDOS.some(([campo]) => campo === k) || k === 'name' || k === 'slug') continue;
    if (v && typeof v === 'object' && (v as RichNode).nodeType === 'document') {
      const texto = richTextToPlain(v);
      if (texto) partes.push(texto);
    }
  }

  if (typeof fields.bodyIndex === 'string' && fields.bodyIndex && partes.length <= 1) {
    partes.push(fields.bodyIndex);
  }
  return partes.filter(Boolean).join(' · ');
}

/**
 * Aplana un documento rich-text de Contentful.
 *
 * Para reglas e items casi siempre existe `bodyIndex`, que ya viene en texto
 * plano; esto hace falta para los campos de unidad (equipment, specialRules,
 * options), que solo vienen como documento, y para las entradas embebidas, que
 * `bodyIndex` no incluye.
 */
export function richTextToPlain(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as RichNode;

  if (typeof n.value === 'string') return n.value;

  // Entradas embebidas: el contenido vive en data.target, no en content.
  if (n.nodeType === 'embedded-entry-block' || n.nodeType === 'embedded-entry-inline') {
    return embebidaAPlano((n as { data?: { target?: unknown } }).data?.target);
  }

  if (!Array.isArray(n.content)) return '';

  const partes = n.content.map(richTextToPlain);
  const tipo = n.nodeType ?? '';

  if (NODOS_CONTENEDOR.has(tipo)) return partes.filter((p) => p.trim()).join('\n').trim();
  if (NODOS_LINEA.has(tipo) || tipo.startsWith('heading-')) {
    return unirLinea(n.content, partes).trim();
  }

  // Inline (text, hyperlink, entry-hyperlink…) y nodos sin nodeType, que el
  // sitio usa como envoltorio: se concatenan, con la misma regla de vecindad.
  return unirLinea(n.content, partes);
}

/**
 * Une los hijos de un nodo de línea.
 *
 * Normalmente van pegados: un link en medio de una frase es parte de la frase,
 * y separarlo la corta. Pero dos referencias vecinas, sin una palabra entre
 * ellas, no son una frase: son una lista, y el sitio la marca solo con la
 * adyacencia.
 *
 * El caso concreto es `specialRules` de una unidad. Venía
 * "Counter ChargeFirst ChargeSwiftstride" — tres reglas pegadas en algo que no
 * se puede leer ni volver a separar. Son 500 unidades del corpus.
 */
function unirLinea(hijos: RichNode[], partes: string[]): string {
  let salida = '';
  for (let i = 0; i < partes.length; i++) {
    const vecinas = esReferencia(hijos[i - 1]?.nodeType) && esReferencia(hijos[i]?.nodeType);
    if (vecinas && salida && partes[i]) salida += ', ';
    salida += partes[i] ?? '';
  }
  return salida;
}

const NODOS_REFERENCIA = new Set([
  'entry-hyperlink',
  'embedded-entry-inline',
  'embedded-entry-block',
]);

function esReferencia(tipo: string | undefined): boolean {
  return tipo !== undefined && NODOS_REFERENCIA.has(tipo);
}

// ─── Helpers de lectura ───────────────────────────────────────────────────

interface RawFile {
  kind: 'rule' | 'item' | 'unit';
  slug: string;
  url: string;
  fetchedAt: string;
  entry?: { fields?: Record<string, unknown> };
}

interface LinkedEntry {
  fields?: { slug?: string; name?: string };
}

/** Slugs de una lista de entradas linkeadas (ruleType, association, …). */
function slugs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((e) => (e as LinkedEntry)?.fields?.slug)
    .filter((s): s is string => typeof s === 'string');
}

/** Nombres de una lista de entradas linkeadas. */
function nombres(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((e) => (e as LinkedEntry)?.fields?.name)
    .filter((s): s is string => typeof s === 'string');
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function numero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Página del reglamento. Algunas entradas traen `pageReferenceOverride` con
 * cosas como "90 & 127", que gana sobre el número.
 */
function pagina(fields: Record<string, unknown>): string {
  const override = texto(fields.pageReferenceOverride);
  if (override) return override;
  const n = numero(fields.pageReference);
  return n === null ? '' : String(n);
}

/** `forces-of-fantasy` y `ravening-hordes` son publicaciones, no ejércitos. */
const NO_ES_EJERCITO = new Set(['forces-of-fantasy', 'ravening-hordes']);

// ─── Parsers por tipo ─────────────────────────────────────────────────────

function parseRule(raw: RawFile): ParsedRule {
  const f = raw.entry?.fields ?? {};
  return ParsedRuleSchema.parse({
    id: `rule-${raw.slug}`,
    slug: raw.slug,
    name: texto(f.name),
    ruleType: slugs(f.ruleType)[0] ?? '',
    associations: slugs(f.association),
    // El documento completo gana sobre bodyIndex: ese campo omite las entradas
    // embebidas, y con ellas el perfil de las armas. Son 742 reglas del corpus.
    text: richTextToPlain(f.body) || texto(f.bodyIndex) || richTextToPlain(f.description),
    related: slugs(f.relatedLinks),
    source: { page: pagina(f), url: raw.url, lastVerified: raw.fetchedAt.slice(0, 10) },
  });
}

function parseItem(raw: RawFile): ParsedItem {
  const f = raw.entry?.fields ?? {};
  return ParsedItemSchema.parse({
    id: `item-${raw.slug}`,
    slug: raw.slug,
    name: texto(f.name),
    type: texto(f.type),
    cost: numero(f.cost) ?? 0,
    itemTypes: slugs(f.magicItemType),
    associations: slugs(f.association),
    // El documento completo gana sobre bodyIndex: ese campo omite las entradas
    // embebidas, y con ellas el perfil de las armas. Son 742 reglas del corpus.
    text: richTextToPlain(f.body) || texto(f.bodyIndex) || richTextToPlain(f.description),
    source: { page: pagina(f), url: raw.url, lastVerified: raw.fetchedAt.slice(0, 10) },
  });
}

function parseUnit(raw: RawFile): ParsedUnit {
  const f = raw.entry?.fields ?? {};
  const asociaciones = slugs(f.association);

  const perfil = Array.isArray(f.unitProfile)
    ? (f.unitProfile as unknown[])
        .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
        .map((p) =>
          Object.fromEntries(
            Object.entries(p).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]),
          ),
        )
    : [];

  return ParsedUnitSchema.parse({
    id: `unit-${raw.slug}`,
    slug: raw.slug,
    name: texto(f.name),
    nameSingular: texto(f.nameSingular),
    army: asociaciones.find((a) => !NO_ES_EJERCITO.has(a)) ?? '',
    associations: asociaciones,
    unitCategory: nombres(f.unitCategory)[0] ?? '',
    troopTypes: nombres(f.troopType),
    profile: perfil,
    baseSize: texto(f.baseSize),
    unitSize: texto(f.unitSize),
    cost: numero(f.cost),
    costOverride: texto(f.costOverride),
    armourValue: texto(f.armourValue),
    equipment: richTextToPlain(f.equipment),
    specialRules: richTextToPlain(f.specialRules),
    options: richTextToPlain(f.options),
    source: { page: pagina(f), url: raw.url, lastVerified: raw.fetchedAt.slice(0, 10) },
  });
}

// ─── Orquestación ─────────────────────────────────────────────────────────

export interface ParseStats {
  rules: number;
  items: number;
  units: number;
  failed: number;
}

interface CliArgs {
  kind: 'rule' | 'item' | 'unit' | 'all';
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { kind: 'all', verbose: false };
  for (const a of argv) {
    if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a.startsWith('--kind=')) {
      const v = a.slice('--kind='.length);
      if (v === 'rule' || v === 'item' || v === 'unit' || v === 'all') args.kind = v;
    }
  }
  return args;
}

function leerCrudos(kind: 'rule' | 'item' | 'unit', dir: string): RawFile[] {
  const sub = join(dir, kind);
  if (!existsSync(sub)) return [];
  return readdirSync(sub)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(sub, f), 'utf-8')) as RawFile);
}

export async function parseAll(
  args: CliArgs = { kind: 'all', verbose: false },
  opts: { dataDir?: string; outDir?: string; silent?: boolean } = {},
): Promise<ParseStats> {
  const dataDir = opts.dataDir ?? DATA_RAW;
  const outDir = opts.outDir ?? DATA_PROCESSED;
  const silent = opts.silent ?? false;
  const log = (m: string): void => {
    if (!silent) console.log(m);
  };

  const stats: ParseStats = { rules: 0, items: 0, units: 0, failed: 0 };
  mkdirSync(outDir, { recursive: true });

  const trabajos = [
    { kind: 'rule' as const, parser: parseRule, salida: 'rules.json', campo: 'rules' as const },
    {
      kind: 'item' as const,
      parser: parseItem,
      salida: 'magic-items.json',
      campo: 'items' as const,
    },
    { kind: 'unit' as const, parser: parseUnit, salida: 'units.json', campo: 'units' as const },
  ];

  for (const t of trabajos) {
    if (args.kind !== 'all' && args.kind !== t.kind) continue;
    const crudos = leerCrudos(t.kind, dataDir);
    const salida: Array<{ slug: string }> = [];

    for (const raw of crudos) {
      try {
        salida.push(t.parser(raw));
      } catch (err) {
        stats.failed++;
        if (args.verbose) console.error(`  [fail] ${t.kind}/${raw.slug}: ${(err as Error).message}`);
      }
    }

    // Orden estable: el diff entre corridas tiene que ser legible.
    salida.sort((a, b) => a.slug.localeCompare(b.slug));
    writeFileSync(join(outDir, t.salida), JSON.stringify(salida, null, 2), 'utf-8');
    stats[t.campo] = salida.length;
    log(`[parse] ${t.salida}: ${salida.length} entradas`);
  }

  if (stats.failed > 0) log(`[parse] ${stats.failed} entradas fallaron el schema`);
  return stats;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const stats = await parseAll(args);
  console.log(
    `\n[parse] Listo: ${stats.rules} reglas · ${stats.items} items · ${stats.units} unidades`,
  );
  if (stats.failed > 0) process.exit(1);
}

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  });
}
