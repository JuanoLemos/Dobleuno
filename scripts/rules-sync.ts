/**
 * Dobleuno · Orquestador del pipeline de reglas
 *
 * Corre end-to-end:
 *   1. mirror:   descarga HTML de tow.whfb.app → data/raw/
 *   2. parse:    HTML → JSON estructurado → data/processed/
 *   3. translate: JSON en inglés → JSON en español → data/translated/
 *   4. copy:     data/translated/ → portal/src/data/  (para que Astro lo levante)
 *
 * Uso:
 *   tsx scripts/rules-sync.ts                    # full pipeline
 *   tsx scripts/rules-sync.ts --skip-mirror       # solo parse + translate + copy
 *   tsx scripts/rules-sync.ts --skip-translate    # solo mirror + parse + copy (sin gastar LLM)
 *   tsx scripts/rules-sync.ts --type=rule         # solo reglas (no items)
 *   tsx scripts/rules-sync.ts --type=item         # solo items
 *   tsx scripts/rules-sync.ts --rate-limit=2000   # ms entre requests
 *   tsx scripts/rules-sync.ts --force             # re-mirror + re-translate
 */

import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mirrorAll } from './mirror-tow.js';
import { parseAll } from './parse-tow.js';
import { translateAll } from './translate-tow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_TRANSLATED = join(ROOT, 'data', 'translated');
const PORTAL_DATA = join(ROOT, 'portal', 'src', 'data');

interface CliArgs {
  skipMirror: boolean;
  skipParse: boolean;
  skipTranslate: boolean;
  type: 'rule' | 'item' | 'all';
  rateLimit: number;
  force: boolean;
  forceTranslate: boolean;
  concurrency: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    skipMirror: false,
    skipParse: false,
    skipTranslate: false,
    type: 'all',
    rateLimit: 2000,
    force: false,
    forceTranslate: false,
    concurrency: 2,
  };
  for (const arg of argv) {
    if (arg === '--skip-mirror') args.skipMirror = true;
    else if (arg === '--skip-parse') args.skipParse = true;
    else if (arg === '--skip-translate') args.skipTranslate = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--force-translate') args.forceTranslate = true;
    else if (arg.startsWith('--type=')) {
      const v = arg.slice('--type='.length);
      args.type = v === 'all' ? 'all' : (v as 'rule' | 'item');
    } else if (arg.startsWith('--rate-limit=')) {
      args.rateLimit = Number.parseInt(arg.slice('--rate-limit='.length), 10);
    } else if (arg.startsWith('--concurrency=')) {
      args.concurrency = Number.parseInt(arg.slice('--concurrency='.length), 10);
    }
  }
  return args;
}

function copyToPortal(): number {
  mkdirSync(PORTAL_DATA, { recursive: true });
  const files: Array<{ from: string; to: string }> = [
    { from: join(DATA_TRANSLATED, 'special-rules.json'), to: join(PORTAL_DATA, 'special-rules.json') },
    { from: join(DATA_TRANSLATED, 'magic-items.json'), to: join(PORTAL_DATA, 'magic-items.json') },
  ];
  let copied = 0;
  for (const { from, to } of files) {
    if (existsSync(from)) {
      copyFileSync(from, to);
      copied++;
      console.log(`[sync] copy: ${from.replace(ROOT + '\\', '')} → ${to.replace(ROOT + '\\', '')}`);
    } else {
      console.warn(`[sync] skip (no existe): ${from.replace(ROOT + '\\', '')}`);
    }
  }
  return copied;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log('[sync] === Dobleuno rules sync ===');
  console.log(`[sync] type: ${args.type}`);
  console.log(`[sync] skip: ${[
    args.skipMirror && 'mirror',
    args.skipParse && 'parse',
    args.skipTranslate && 'translate',
  ].filter(Boolean).join(', ') || '(ninguno)'}`);

  if (!args.skipMirror) {
    console.log('\n[sync] STEP 1/4: mirror');
    const t0 = Date.now();
    const stats = await mirrorAll(
      { rateLimit: args.rateLimit, dryRun: false, force: args.force, verbose: false },
      { silent: false },
    );
    console.log(`[sync] mirror done in ${((Date.now() - t0) / 1000).toFixed(1)}s (downloaded=${stats.downloaded}, skipped=${stats.skipped}, failed=${stats.failed})`);
    if (stats.failed > 0) {
      console.warn(`[sync] ${stats.failed} URLs fallaron en el mirror. Continúo igual.`);
    }
  } else {
    console.log('\n[sync] STEP 1/4: mirror (skipped)');
  }

  if (!args.skipParse) {
    console.log('\n[sync] STEP 2/4: parse');
    const t0 = Date.now();
    const parseType = args.type === 'all' ? 'all' : (args.type === 'rule' ? 'rule' : 'item');
    const stats = await parseAll(
      { strict: true, type: parseType },
      { silent: false },
    );
    console.log(`[sync] parse done in ${((Date.now() - t0) / 1000).toFixed(1)}s (parsed=${stats.parsed}, failed=${stats.failed})`);
    if (stats.failed > 0) {
      console.warn(`[sync] ${stats.failed} archivos fallaron en parse. Continúo igual.`);
    }
  } else {
    console.log('\n[sync] STEP 2/4: parse (skipped)');
  }

  if (!args.skipTranslate) {
    console.log('\n[sync] STEP 3/4: translate (LLM)');
    const t0 = Date.now();
    try {
      const stats = await translateAll({
        type: args.type,
        force: args.forceTranslate,
        concurrency: args.concurrency,
        dryRun: false,
        batchSize: 8,
      });
      console.log(`[sync] translate done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      console.error(`[sync] translate falló: ${(e as Error).message}`);
      console.warn('[sync] Continúo con el copy (puede haber datos viejos).');
    }
  } else {
    console.log('\n[sync] STEP 3/4: translate (skipped)');
  }

  console.log('\n[sync] STEP 4/4: copy to portal/');
  const copied = copyToPortal();
  console.log(`[sync] copy done (${copied} archivos)`);

  console.log('\n[sync] === OK ===');
  console.log('[sync] Next: cd portal && npm install && npm run build');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
