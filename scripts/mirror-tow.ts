/**
 * Dobleuno · Mirror de tow.whfb.app
 *
 * Descarga el Codex completo a data/raw/ como JSON estructurado.
 *
 * ── Cómo funciona el sitio (relevado 2026-09-14) ─────────────────────────
 *
 * tow.whfb.app es un Next.js con SSG y `fallback: true`, con Contentful detrás.
 * Cada página de contenido incrusta TODO en un `<script id="__NEXT_DATA__">`:
 * la entrada completa, sus referencias cruzadas (errata y FAQs), y prev/next.
 * No hace falta renderizar JS ni tocar su API — que además su robots.txt
 * prohíbe (`Disallow: /api/*`).
 *
 * Las URLs son:
 *   reglas    /<ruleType>/<slug>     ej. /the-combat-phase/supporting-attacks
 *   items     /magic-item/<slug>
 *   unidades  /unit/<slug>
 *
 * El manifest NO se hardcodea: sale de los tres índices del sitio
 * (/sitemap/rules, /sitemap/magic-items, /sitemap/armies), que traen la lista
 * completa con el `ruleType` de cada regla. Si el sitio agrega contenido,
 * aparece solo en la próxima corrida.
 *
 * ── Por qué el mirror anterior no bajó nada ──────────────────────────────
 *
 * Pedía `/rules/<slug>.html`, que no es una ruta del sitio. Next respondía con
 * el shell de carga (`isFallback: true`, título "Loading...") y el parser
 * terminaba extrayendo el `<h1>` del header. Los 39 archivos de data/raw/
 * tenían el mismo MD5 y las 39 "reglas" salían con el mismo nombre. Vivió dos
 * meses porque nadie abrió el JSON: ver scripts/validate-corpus.ts, que ahora
 * corta el pipeline si el corpus sale degenerado.
 *
 * Uso:
 *   tsx scripts/mirror-tow.ts                     # todo el codex (~3100 entradas)
 *   tsx scripts/mirror-tow.ts --kind=rule         # solo reglas
 *   tsx scripts/mirror-tow.ts --limit=20          # primeras 20 (para probar)
 *   tsx scripts/mirror-tow.ts --rate-limit=2000   # ms entre requests
 *   tsx scripts/mirror-tow.ts --dry-run           # lista URLs sin descargar
 *   tsx scripts/mirror-tow.ts --force             # re-descarga lo cacheado
 *
 * Es resumible: lo ya descargado se saltea salvo --force.
 *
 * Variables de entorno:
 *   TOW_BASE_URL   default: https://tow.whfb.app
 *   MIRROR_UA      default: Dobleuno/0.1 (+contact)
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_RAW = join(ROOT, 'data', 'raw');

const TOW_BASE_URL = process.env.TOW_BASE_URL ?? 'https://tow.whfb.app';
const USER_AGENT = process.env.MIRROR_UA ?? 'Dobleuno/0.1 (+https://github.com/JuanoLemos/Dobleuno)';
const DEFAULT_RATE_LIMIT_MS = 2000;

/**
 * Espera antes de reintentar una página que volvió en estado fallback.
 *
 * Con `fallback: true`, el primer request de una página no pre-generada
 * devuelve el shell y dispara la generación en background; el segundo ya trae
 * el contenido.
 */
const WARMUP_MS = 3000;

export type EntryKind = 'rule' | 'item' | 'unit';

export interface MirrorTarget {
  kind: EntryKind;
  /** Slug de la entrada. */
  slug: string;
  /** Segmento padre de la URL: el ruleType para reglas, fijo para el resto. */
  parent: string;
  url: string;
}

/** Lo que se guarda en disco por entrada. */
export interface RawEntry {
  kind: EntryKind;
  slug: string;
  parent: string;
  url: string;
  fetchedAt: string;
  entry: Record<string, unknown>;
  crossReference?: Record<string, unknown>;
}

// ─── CLI args ─────────────────────────────────────────────────────────────

interface CliArgs {
  kind: EntryKind | 'all';
  limit?: number;
  rateLimit: number;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    kind: 'all',
    rateLimit: DEFAULT_RATE_LIMIT_MS,
    dryRun: false,
    force: false,
    verbose: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--verbose' || arg === '-v') args.verbose = true;
    else if (arg.startsWith('--kind=')) {
      const v = arg.slice('--kind='.length);
      if (v === 'rule' || v === 'item' || v === 'unit' || v === 'all') args.kind = v;
    } else if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isNaN(n) && n > 0) args.limit = n;
    } else if (arg.startsWith('--rate-limit=')) {
      const n = Number.parseInt(arg.slice('--rate-limit='.length), 10);
      if (!Number.isNaN(n) && n >= 0) args.rateLimit = n;
    }
  }
  return args;
}

// ─── __NEXT_DATA__ ────────────────────────────────────────────────────────

const NEXT_DATA_RE = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

interface NextData {
  props?: { pageProps?: Record<string, unknown> };
  isFallback?: boolean;
}

/** Extrae y parsea el payload de Next embebido en el HTML. */
export function extractNextData(html: string): NextData | null {
  const m = NEXT_DATA_RE.exec(html);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as NextData;
  } catch {
    return null;
  }
}

function pageProps(html: string): Record<string, unknown> | null {
  return extractNextData(html)?.props?.pageProps ?? null;
}

// ─── robots.txt ───────────────────────────────────────────────────────────

interface RobotsRule {
  isAllowed: (url: string) => boolean;
}

/**
 * Convierte un patrón de robots.txt en regex.
 *
 * Los patrones son prefijos, con `*` como comodín y `$` como ancla de fin.
 * La versión anterior hacía `url.includes(path)`: con un patrón como `/api/*`
 * eso nunca matchea de forma literal, así que el chequeo pasaba siempre y
 * "respetábamos robots.txt" por accidente.
 */
function patternToRegex(pattern: string): RegExp {
  const anclado = pattern.endsWith('$');
  const cuerpo = anclado ? pattern.slice(0, -1) : pattern;
  const escapado = cuerpo.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escapado}${anclado ? '$' : ''}`);
}

export function parseRobotsTxt(content: string, userAgent: string): RobotsRule {
  const grupos: Array<{ agents: string[]; reglas: Array<{ allow: boolean; pattern: string }> }> = [];
  let actual: (typeof grupos)[number] | null = null;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(User-agent|Disallow|Allow):\s*(.*)$/i.exec(line);
    if (!m?.[1]) continue;
    const clave = m[1].toLowerCase();
    const valor = (m[2] ?? '').trim();

    if (clave === 'user-agent') {
      // Varios User-agent seguidos comparten el mismo grupo de reglas.
      if (actual && actual.reglas.length > 0) {
        grupos.push(actual);
        actual = null;
      }
      actual ??= { agents: [], reglas: [] };
      actual.agents.push(valor.toLowerCase());
    } else if (actual && valor) {
      actual.reglas.push({ allow: clave === 'allow', pattern: valor });
    }
  }
  if (actual && actual.reglas.length > 0) grupos.push(actual);

  const ua = userAgent.toLowerCase();
  const aplicables = grupos.filter(
    (g) => g.agents.includes('*') || g.agents.some((a) => a.length > 0 && ua.includes(a)),
  );

  return {
    isAllowed: (url: string): boolean => {
      let pathname: string;
      try {
        pathname = new URL(url).pathname;
      } catch {
        return false;
      }
      // Gana la regla más específica (el patrón más largo). Ante empate, Allow.
      let mejor: { allow: boolean; len: number } | null = null;
      for (const g of aplicables) {
        for (const r of g.reglas) {
          if (!patternToRegex(r.pattern).test(pathname)) continue;
          if (!mejor || r.pattern.length > mejor.len || (r.pattern.length === mejor.len && r.allow)) {
            mejor = { allow: r.allow, len: r.pattern.length };
          }
        }
      }
      return mejor ? mejor.allow : true;
    },
  };
}

async function loadRobots(): Promise<RobotsRule> {
  try {
    const res = await fetch(`${TOW_BASE_URL}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      console.warn(`robots.txt no accesible (${res.status}), asumimos allow all`);
      return { isAllowed: () => true };
    }
    return parseRobotsTxt(await res.text(), USER_AGENT);
  } catch (err) {
    console.warn('robots.txt no se pudo descargar:', (err as Error).message);
    return { isAllowed: () => true };
  }
}

// ─── Manifest ─────────────────────────────────────────────────────────────

interface SitemapEntry {
  fields?: {
    name?: string;
    slug?: string;
    ruleType?: Array<{ fields?: { slug?: string } }>;
  };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en,es;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Arma el manifest desde los tres índices del sitio. */
export async function fetchManifest(
  kind: CliArgs['kind'],
  rateLimit: number,
): Promise<MirrorTarget[]> {
  const targets: MirrorTarget[] = [];

  if (kind === 'rule' || kind === 'all') {
    const pp = pageProps(await fetchHtml(`${TOW_BASE_URL}/sitemap/rules`));
    for (const r of (pp?.rules ?? []) as SitemapEntry[]) {
      const slug = r.fields?.slug;
      const parent = r.fields?.ruleType?.[0]?.fields?.slug;
      if (!slug || !parent) continue;
      targets.push({ kind: 'rule', slug, parent, url: `${TOW_BASE_URL}/${parent}/${slug}` });
    }
    await sleep(rateLimit);
  }

  if (kind === 'item' || kind === 'all') {
    const pp = pageProps(await fetchHtml(`${TOW_BASE_URL}/sitemap/magic-items`));
    for (const i of (pp?.magicItems ?? []) as SitemapEntry[]) {
      const slug = i.fields?.slug;
      if (!slug) continue;
      targets.push({
        kind: 'item',
        slug,
        parent: 'magic-item',
        url: `${TOW_BASE_URL}/magic-item/${slug}`,
      });
    }
    await sleep(rateLimit);
  }

  if (kind === 'unit' || kind === 'all') {
    const pp = pageProps(await fetchHtml(`${TOW_BASE_URL}/sitemap/armies`));
    for (const u of (pp?.units ?? []) as SitemapEntry[]) {
      const slug = u.fields?.slug;
      if (!slug) continue;
      targets.push({ kind: 'unit', slug, parent: 'unit', url: `${TOW_BASE_URL}/unit/${slug}` });
    }
  }

  return targets;
}

// ─── Descarga ─────────────────────────────────────────────────────────────

export interface MirrorStats {
  attempted: number;
  downloaded: number;
  skipped: number;
  failed: number;
  warmups: number;
  bytes: number;
}

function entryDe(
  html: string,
): { entry: Record<string, unknown>; crossReference?: Record<string, unknown> } | null {
  const pp = pageProps(html);
  if (!pp) return null;
  const entry = pp.entry as Record<string, unknown> | undefined;
  if (!entry || Object.keys(entry).length === 0) return null;
  return { entry, crossReference: pp.crossReference as Record<string, unknown> | undefined };
}

async function mirrorOne(
  target: MirrorTarget,
  args: CliArgs,
  robots: RobotsRule,
  outDir: string,
): Promise<{ status: 'ok' | 'skip' | 'fail'; bytes?: number; warmup?: boolean; error?: string }> {
  const outPath = join(outDir, target.kind, `${target.slug}.json`);
  if (!args.force && existsSync(outPath)) return { status: 'skip' };

  if (!robots.isAllowed(target.url)) {
    return { status: 'fail', error: 'bloqueado por robots.txt' };
  }

  try {
    let html = await fetchHtml(target.url);
    let datos = entryDe(html);
    let warmup = false;

    // Página no pre-generada: el primer request la dispara, el segundo la trae.
    if (!datos) {
      warmup = true;
      await sleep(WARMUP_MS);
      html = await fetchHtml(target.url);
      datos = entryDe(html);
    }
    if (!datos) return { status: 'fail', warmup, error: 'entry vacío después del warm-up' };

    const payload: RawEntry = {
      kind: target.kind,
      slug: target.slug,
      parent: target.parent,
      url: target.url,
      fetchedAt: new Date().toISOString(),
      entry: datos.entry,
      ...(datos.crossReference ? { crossReference: datos.crossReference } : {}),
    };
    const json = JSON.stringify(payload);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, json, 'utf-8');
    return { status: 'ok', bytes: json.length, warmup };
  } catch (err) {
    return { status: 'fail', error: (err as Error).message };
  }
}

export async function mirrorAll(
  args: CliArgs,
  opts: { dataDir?: string; silent?: boolean } = {},
): Promise<MirrorStats> {
  const dataDir = opts.dataDir ?? DATA_RAW;
  const silent = opts.silent ?? false;
  const log = (msg: string): void => {
    if (!silent) console.log(msg);
  };
  const err = (msg: string): void => {
    if (!silent) console.error(msg);
  };

  log(`[mirror] Base URL: ${TOW_BASE_URL}`);
  log(`[mirror] User-Agent: ${USER_AGENT}`);
  log(`[mirror] Rate limit: ${args.rateLimit}ms · warm-up: ${WARMUP_MS}ms`);
  log('[mirror] Leyendo manifest desde los índices del sitio…');

  let targets = await fetchManifest(args.kind, args.rateLimit);
  const total = targets.length;
  if (args.limit) targets = targets.slice(0, args.limit);

  const porTipo = targets.reduce<Record<string, number>>((acc, t) => {
    acc[t.kind] = (acc[t.kind] ?? 0) + 1;
    return acc;
  }, {});
  log(
    `[mirror] Manifest: ${total} entradas (${Object.entries(porTipo)
      .map(([k, v]) => `${k}:${v}`)
      .join(' · ')})${args.limit ? ` — limitado a ${targets.length}` : ''}`,
  );

  if (args.dryRun) {
    for (const t of targets.slice(0, 20)) log(`  [dry-run] ${t.kind}/${t.slug} → ${t.url}`);
    if (targets.length > 20) log(`  ... y ${targets.length - 20} más`);
    return { attempted: targets.length, downloaded: 0, skipped: 0, failed: 0, warmups: 0, bytes: 0 };
  }

  const robots = await loadRobots();
  const stats: MirrorStats = {
    attempted: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    warmups: 0,
    bytes: 0,
  };
  const t0 = performance.now();

  for (const target of targets) {
    stats.attempted++;
    const res = await mirrorOne(target, args, robots, dataDir);
    if (res.warmup) stats.warmups++;

    if (res.status === 'ok') {
      stats.downloaded++;
      stats.bytes += res.bytes ?? 0;
      if (args.verbose) log(`  [ok]   ${target.kind}/${target.slug} (${res.bytes} B)`);
    } else if (res.status === 'skip') {
      stats.skipped++;
    } else {
      stats.failed++;
      err(`  [fail] ${target.kind}/${target.slug}: ${res.error}`);
    }

    // Progreso cada 100: la corrida completa son horas.
    if (!args.verbose && stats.attempted % 100 === 0) {
      const pct = ((stats.attempted / targets.length) * 100).toFixed(0);
      log(
        `  … ${stats.attempted}/${targets.length} (${pct}%) · ok:${stats.downloaded} fail:${stats.failed}`,
      );
    }

    if (res.status !== 'skip' && stats.attempted < targets.length) {
      await sleep(args.rateLimit);
    }
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  log(`\n[mirror] Listo en ${elapsed}s`);
  log(`  intentadas:  ${stats.attempted}`);
  log(`  descargadas: ${stats.downloaded}`);
  log(`  cacheadas:   ${stats.skipped}`);
  log(`  fallidas:    ${stats.failed}`);
  log(`  warm-ups:    ${stats.warmups}`);
  log(`  bytes:       ${(stats.bytes / 1024).toFixed(1)} KiB`);
  return stats;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const stats = await mirrorAll(args);
  if (stats.failed > 0) process.exit(1);
}

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  });
}
