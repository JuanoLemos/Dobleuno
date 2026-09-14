/**
 * Dobleuno · Orquestador del pipeline de reglas
 *
 * Corre end-to-end:
 *   1. mirror:    tow.whfb.app → data/raw/          (JSON por entrada)
 *   2. parse:     data/raw/ → data/processed/       (corpus normalizado)
 *   3. validate:  corta si el corpus salió degenerado
 *   4. translate: data/processed/ → data/translated/ (LLM, cache por hash)
 *   5. validate:  corta si la traducción no tradujo
 *
 * El paso de validación no es decorativo: entre la Ola 2 y la Ola 11 este
 * pipeline terminó con exit 0 durante dos meses escribiendo 39 entradas basura
 * (ver scripts/validate-corpus.ts). Un pipeline que no puede fallar no avisa.
 *
 * Uso:
 *   tsx scripts/rules-sync.ts                    # full pipeline
 *   tsx scripts/rules-sync.ts --skip-mirror      # parse + validate + translate
 *   tsx scripts/rules-sync.ts --skip-translate   # sin gastar LLM
 *   tsx scripts/rules-sync.ts --kind=rule        # solo reglas
 *   tsx scripts/rules-sync.ts --rate-limit=2000  # ms entre requests
 *   tsx scripts/rules-sync.ts --force            # re-mirror + re-translate
 */

import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mirrorAll } from './mirror-tow.js';
import { parseAll } from './parse-tow.js';
import { translateAll, promover, DATA_STAGING } from './translate-tow.js';
import { validarCorpus, type Hallazgo } from './validate-corpus.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_PROCESSED = join(ROOT, 'data', 'processed');

interface CliArgs {
  skipMirror: boolean;
  skipParse: boolean;
  skipTranslate: boolean;
  kind: 'rule' | 'item' | 'unit' | 'all';
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
    kind: 'all',
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
    else if (arg.startsWith('--kind=')) {
      const v = arg.slice('--kind='.length);
      if (v === 'rule' || v === 'item' || v === 'unit' || v === 'all') args.kind = v;
    } else if (arg.startsWith('--rate-limit=')) {
      args.rateLimit = Number.parseInt(arg.slice('--rate-limit='.length), 10);
    } else if (arg.startsWith('--concurrency=')) {
      args.concurrency = Number.parseInt(arg.slice('--concurrency='.length), 10);
    }
  }
  return args;
}

/** Imprime los hallazgos y devuelve true si hay que abortar. */
function reportar(etapa: string, hallazgos: Hallazgo[]): boolean {
  const errores = hallazgos.filter((h) => h.nivel === 'error');
  for (const h of hallazgos.filter((x) => x.nivel === 'aviso')) {
    console.warn(`  [aviso] ${h.archivo}: ${h.mensaje}`);
  }
  for (const h of errores) console.error(`  [ERROR] ${h.archivo}: ${h.mensaje}`);
  if (errores.length > 0) {
    console.error(`[sync] ${etapa}: ${errores.length} errores. Abortamos.`);
    return true;
  }
  console.log(`[sync] ${etapa}: OK`);
  return false;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log('[sync] === Dobleuno rules sync ===');
  console.log(`[sync] kind: ${args.kind}`);
  console.log(
    `[sync] skip: ${
      [
        args.skipMirror && 'mirror',
        args.skipParse && 'parse',
        args.skipTranslate && 'translate',
      ]
        .filter(Boolean)
        .join(', ') || '(ninguno)'
    }`,
  );

  if (!args.skipMirror) {
    console.log('\n[sync] PASO 1/5: mirror');
    const t0 = Date.now();
    const stats = await mirrorAll(
      {
        kind: args.kind,
        rateLimit: args.rateLimit,
        dryRun: false,
        force: args.force,
        verbose: false,
      },
      { silent: false },
    );
    console.log(
      `[sync] mirror en ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
        `(bajadas=${stats.downloaded}, cacheadas=${stats.skipped}, fallidas=${stats.failed})`,
    );
    if (stats.failed > 0) console.warn(`[sync] ${stats.failed} URLs fallaron. Sigo.`);
  } else {
    console.log('\n[sync] PASO 1/5: mirror (salteado)');
  }

  if (!args.skipParse) {
    console.log('\n[sync] PASO 2/5: parse');
    const t0 = Date.now();
    const stats = await parseAll({ kind: args.kind, verbose: false }, { silent: false });
    console.log(
      `[sync] parse en ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
        `(${stats.rules} reglas, ${stats.items} items, ${stats.units} unidades, ${stats.failed} fallidas)`,
    );
  } else {
    console.log('\n[sync] PASO 2/5: parse (salteado)');
  }

  console.log('\n[sync] PASO 3/5: validar corpus en inglés');
  if (reportar('corpus', validarCorpus(DATA_PROCESSED))) process.exit(1);

  if (!args.skipTranslate) {
    console.log('\n[sync] PASO 4/5: translate (LLM)');
    const t0 = Date.now();
    try {
      await translateAll({
        type: args.kind === 'all' ? 'all' : args.kind === 'item' ? 'item' : 'rule',
        force: args.forceTranslate,
        concurrency: args.concurrency,
        dryRun: false,
        batchSize: 8,
      });
      console.log(`[sync] translate en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      console.error(`[sync] translate falló: ${(e as Error).message}`);
      process.exit(1);
    }

    // Se valida el STAGING, no el destino. Recién si pasa, se promueve.
    //
    // Antes el traductor escribía directo a data/translated/ y esta validación
    // corría después: hacía exit(1) y dejaba los archivos malos en disco, donde
    // el seed los prefiere por existir. O sea que el pipeline "fallaba" y el
    // corpus roto quedaba igual listo para sembrar.
    console.log('\n[sync] PASO 5/5: validar corpus traducido');
    if (reportar('traducción', validarCorpus(DATA_STAGING, { traducido: true }))) {
      console.error(`[sync] El staging queda en ${DATA_STAGING} para inspección.`);
      process.exit(1);
    }
    promover();
  } else {
    console.log('\n[sync] PASO 4/5: translate (salteado)');
    console.log('[sync] PASO 5/5: validar traducción (salteado)');
  }

  console.log('\n[sync] === OK ===');
  console.log('[sync] Siguiente: npm run kb:seed -w @dobleuno/server');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
