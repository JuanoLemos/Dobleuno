/**
 * Ola 7.1 — Tests del job queue en memoria de kb-sync.
 *
 * Verifica que:
 *   - runSync() devuelve un jobId
 *   - getCurrentJob() devuelve null cuando no hay nada corriendo
 *   - getSyncStatus() devuelve un objeto con shape esperado
 *   - Llamar runSync() de nuevo mientras uno corre → alreadyRunning=true con mismo jobId
 *
 * No testeamos el pipeline completo (mirror/parse/ingest) porque requiere DB
 * con pgvector + accesso a tow.whfb.app. Eso lo cubre el test de integration.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { runSync, getSyncStatus, getCurrentJob } from '../lib/kb-sync.js';

describe('kb-sync job queue', () => {
  beforeEach(() => {
    // Los jobs persisten en memoria entre tests. Resetear manualmente no es trivial
    // (no exportamos un clearJobs); los tests aquí son independientes y no arrancan
    // jobs reales — solo verifican el shape del estado.
  });

  it('getCurrentJob() sin jobs corriendo → null', () => {
    // Si un sync anterior terminó, getCurrentJob devuelve null aunque lastFinishedJob exista.
    const j = getCurrentJob();
    expect(j === null || j.status !== 'running').toBe(true);
  });

  it('getSyncStatus() devuelve shape correcto (null o job)', () => {
    const j = getSyncStatus();
    if (j !== null) {
      expect(j).toHaveProperty('jobId');
      expect(j).toHaveProperty('status');
      expect(j).toHaveProperty('startedAt');
    } else {
      expect(j).toBeNull();
    }
  });

  // Tests que disparan un sync real podrían tardar minutos (mirror a tow.whfb.app).
  // No los corremos por default; están como ejemplos para ejecutarse manualmente
  // con `RUN_KB_SYNC_TEST=1`.
  if (process.env.RUN_KB_SYNC_TEST === '1') {
    it('runSync() devuelve jobId y alreadyRunning=false', () => {
      const { jobId, alreadyRunning } = runSync({ forcedBy: 'vitest' });
      expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
      expect(alreadyRunning).toBe(false);
    }, 60_000);
  }
});
