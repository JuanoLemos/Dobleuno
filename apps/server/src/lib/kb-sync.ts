/**
 * Ola 7.1 — Orquestador del sync KB: mirror → parse → ingest.
 *
 * Cada paso se registra en ingest_log. El job corre en background, protegido
 * por un mutex (un sync simultáneo como máximo). El status se puede consultar
 * con getSyncStatus().
 *
 * Funciones:
 *   - runSync({ forcedBy })     → arranca un sync en background, devuelve jobId
 *   - getSyncStatus()           → estado del job actual o el último
 *   - getCurrentJob()           → job actual corriendo (o null)
 *
 * Persistencia: mientras el server esté vivo, el status vive en memoria.
 * Si el server se reinicia mid-sync, el job se pierde (se acepta para v1;
 * re-triggear manual está OK).
 */
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { ingestLog } from '../db/schema/kb.js';
import { log } from './logger.js';
import { env } from '../env.js';
import { ingestProcessedFiles, type IngestStats } from './kb-ingest.js';

// ROOT del monorepo: apps/server/src/lib/kb-sync.ts → apps/server/src/lib → apps/server/src → apps/server → repo
// (import.meta.dirname disponible en Node 22+; fallback por compat).
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const DEFAULT_DATA_DIR = resolve(REPO_ROOT, 'data');

// Los scripts mirror-tow / parse-tow viven en /scripts (fuera del tsconfig.rootDir del server).
// Se cargan vía dynamic import en runtime (no typecheck), para evitar el error TS6059.
type MirrorAllFn = (
  args: { rateLimit: number; dryRun: boolean; force: boolean; verbose: boolean },
  opts: { dataDir?: string; silent?: boolean },
) => Promise<{ attempted: number; downloaded: number; skipped: number; failed: number; bytes: number }>;

type ParseAllFn = (
  args: { strict: boolean },
  opts: { rawDir?: string; outDir?: string; silent?: boolean },
) => Promise<{ files: number; parsed: number; failed: number; errors: Array<{ file: string; error: string }> }>;

// ─── Types ─────────────────────────────────────────────────────────────────

export type SyncStage = 'mirror' | 'parse' | 'ingest';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'queued';

export interface SyncJob {
  jobId: string;
  status: SyncStatus;
  stage: SyncStage | null;
  startedAt: string;
  finishedAt: string | null;
  forcedBy: string | null;
  /** última actualización (para polling) */
  updatedAt: string;
  stats: {
    mirror?: { attempted: number; downloaded: number; skipped: number; failed: number; bytes: number };
    parse?: { files: number; parsed: number; failed: number; errors: number };
    ingest?: IngestStats;
  };
  errorMessage?: string;
}

// ─── Job state (in-memory) ──────────────────────────────────────────────────

let currentJob: SyncJob | null = null;
let lastFinishedJob: SyncJob | null = null;
let queue: Promise<void> = Promise.resolve();

const DEFAULT_MIRROR_ARGS = {
  rateLimit: 2000,
  dryRun: false,
  force: false,
  verbose: false,
} as const;

const DEFAULT_PARSE_ARGS = {
  strict: false,
} as const;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Arranca un sync en background. Devuelve el jobId para tracking.
 * Si ya hay uno corriendo, devuelve el jobId del existente (no encola un segundo).
 */
export function runSync(opts: { forcedBy: string; dataDir?: string }): { jobId: string; alreadyRunning: boolean } {
  if (currentJob && (currentJob.status === 'running' || currentJob.status === 'pending')) {
    log.warn('Sync ya en curso, devolviendo jobId existente', {
      runningJobId: currentJob.jobId,
    });
    return { jobId: currentJob.jobId, alreadyRunning: true };
  }

  const job: SyncJob = {
    jobId: randomUUID(),
    status: 'pending',
    stage: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    forcedBy: opts.forcedBy,
    updatedAt: new Date().toISOString(),
    stats: {},
  };
  currentJob = job;

  // Lock en memoria: encadena el job a cualquier otro que esté corriendo.
  queue = queue.then(() => runSyncImpl(job, opts.dataDir).catch(() => undefined));

  return { jobId: job.jobId, alreadyRunning: false };
}

/**
 * Devuelve el estado actual del job (current o último terminado).
 */
export function getSyncStatus(): SyncJob | null {
  return currentJob ?? lastFinishedJob;
}

/** Devuelve solo si hay un job corriendo AHORA. */
export function getCurrentJob(): SyncJob | null {
  if (currentJob && currentJob.status === 'running') return currentJob;
  return null;
}

// ─── Implementation ─────────────────────────────────────────────────────────

async function runSyncImpl(job: SyncJob, customDataDir?: string): Promise<void> {
  // Orden de prioridad: customDataDir > KB_DATA_DIR env > DEFAULT (raíz del repo).
  // Usamos REPO_ROOT en vez de process.cwd() para que no se confunda si npm
  // workspaces cambia el cwd del sub-proceso.
  const dataDir = customDataDir ?? env.KB_DATA_DIR ?? DEFAULT_DATA_DIR;
  const rawDir = resolve(dataDir, 'raw');
  const processedDir = resolve(dataDir, 'processed');

  job.status = 'running';
  job.stage = 'mirror';
  job.updatedAt = new Date().toISOString();
  log.info(`[sync ${job.jobId}] → starting`, { forcedBy: job.forcedBy });

  // Crear filas en ingest_log — una por stage
  const logIds = {
    mirror: await insertLogRow('mirror'),
    parse: await insertLogRow('parse'),
    ingest: await insertLogRow('ingest'),
  };

  try {
    // Cargar mirror-tow / parse-tow dinámicamente (scripts fuera del tsconfig del server).
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const mirrorMod = (await import('../../../../scripts/mirror-tow.ts' as string)) as {
      mirrorAll: MirrorAllFn;
    };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const parseMod = (await import('../../../../scripts/parse-tow.ts' as string)) as {
      parseAll: ParseAllFn;
    };

    // ── mirror ────────────────────────────────────────────────────────────
    const mirrorStats = await mirrorMod.mirrorAll(
      { ...DEFAULT_MIRROR_ARGS },
      { dataDir: rawDir, silent: true },
    );
    job.stats.mirror = mirrorStats;
    job.updatedAt = new Date().toISOString();
    await updateLogRow(logIds.mirror, 'completed', mirrorStats.downloaded, mirrorStats.failed);

    // ── parse ─────────────────────────────────────────────────────────────
    job.stage = 'parse';
    job.updatedAt = new Date().toISOString();
    const parseStats = await parseMod.parseAll(
      { ...DEFAULT_PARSE_ARGS },
      { rawDir, outDir: processedDir, silent: true },
    );
    job.stats.parse = {
      files: parseStats.files,
      parsed: parseStats.parsed,
      failed: parseStats.failed,
      errors: parseStats.errors.length,
    };
    job.updatedAt = new Date().toISOString();
    await updateLogRow(logIds.parse, 'completed', parseStats.parsed, parseStats.failed);

    // ── ingest ────────────────────────────────────────────────────────────
    job.stage = 'ingest';
    job.updatedAt = new Date().toISOString();
    const ingestStats = await ingestProcessedFiles({ processedDir, silent: true });
    job.stats.ingest = ingestStats;
    job.updatedAt = new Date().toISOString();
    await updateLogRow(logIds.ingest, 'completed', ingestStats.chunksCreated, ingestStats.failed);

    job.status = 'completed';
    job.stage = null;
    job.finishedAt = new Date().toISOString();
    job.updatedAt = job.finishedAt;
    log.info(`[sync ${job.jobId}] ✓ completed`, job.stats);
  } catch (err) {
    const msg = (err as Error).message;
    job.status = 'failed';
    job.errorMessage = msg;
    job.finishedAt = new Date().toISOString();
    job.updatedAt = job.finishedAt;
    log.error(`[sync ${job.jobId}] failed: ${msg}`, { stage: job.stage });

    // Marcar el log del stage fallido
    if (job.stage && logIds[job.stage]) {
      await updateLogRow(logIds[job.stage], 'failed', 0, 1, msg).catch(() => undefined);
    }
  } finally {
    lastFinishedJob = job;
    // Si nadie más disparó otro sync, limpiamos currentJob
    if (currentJob?.jobId === job.jobId) {
      currentJob = null;
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function insertLogRow(type: SyncStage): Promise<string> {
  const id = randomUUID();
  try {
    await db.insert(ingestLog).values({ id, type, status: 'pending' });
  } catch (err) {
    log.warn(`insertLogRow(${type}) failed`, { error: (err as Error).message });
  }
  return id;
}

async function updateLogRow(
  id: string,
  status: 'completed' | 'failed',
  processed: number,
  failed: number,
  errorMessage?: string,
): Promise<void> {
  try {
    await db
      .update(ingestLog)
      .set({
        status,
        finishedAt: new Date(),
        filesProcessed: processed,
        filesFailed: failed,
        ...(errorMessage ? { errorMessage } : {}),
      })
      .where(eq(ingestLog.id, id));
  } catch (err) {
    log.warn(`updateLogRow(${id}) failed`, { error: (err as Error).message });
  }
}

/** Helper para el endpoint /status: devuelve los últimos N logs de la BD. */
export async function getRecentSyncLogs(limit = 10): Promise<
  Array<{
    id: string;
    type: SyncStage;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    filesProcessed: number;
    filesFailed: number;
    errorMessage: string | null;
  }>
> {
  const rows = await db
    .select()
    .from(ingestLog)
    .orderBy(desc(ingestLog.startedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type as SyncStage,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    filesProcessed: r.filesProcessed,
    filesFailed: r.filesFailed,
    errorMessage: r.errorMessage,
  }));
}
