/**
 * Health checks.
 *
 * Son dos, y la diferencia importa:
 *
 *   GET /api/health        liveness  — ¿el proceso responde? 200 siempre.
 *   GET /api/health/ready  readiness — ¿puede atender? 503 si falta la base.
 *
 * ── Por qué se separaron (Ola 12) ────────────────────────────────────────
 *
 * Había uno solo y devolvía 200 pasara lo que pasara, con `database: "down"`
 * adentro del cuerpo. El `HEALTHCHECK` del Dockerfile apuntaba ahí, así que un
 * contenedor con la base inalcanzable quedaba `healthy` para siempre, y un
 * smoke test que mirara el status pasaba sin enterarse.
 *
 * La separación es la convención de Kubernetes y vale igual acá: un
 * orquestador no debería reiniciar el proceso porque se cayó la base
 * (liveness), pero sí debería dejar de mandarle tráfico (readiness).
 */
import { Router } from 'express';
import { createRequire } from 'node:module';

import { isDbHealthy } from '../db/client.js';

export const healthRouter: Router = Router();

/**
 * La versión sale del package.json, no de una constante.
 *
 * Estuvo hardcodeada en '0.2.0' hasta la Ola 12, con el repo en 1.2.0: el
 * endpoint que existe para saber qué está corriendo informaba una versión de
 * diez releases atrás.
 */
const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

function cuerpo(dbHealthy: boolean, status: string): Record<string, unknown> {
  return {
    status,
    service: 'dobleuno-server',
    version,
    timestamp: new Date().toISOString(),
    dependencies: { database: dbHealthy ? 'up' : 'down' },
  };
}

healthRouter.get('/', async (_req, res) => {
  res.json(cuerpo(await isDbHealthy(), 'ok'));
});

healthRouter.get('/ready', async (_req, res) => {
  const dbHealthy = await isDbHealthy();
  res.status(dbHealthy ? 200 : 503).json(cuerpo(dbHealthy, dbHealthy ? 'ready' : 'not-ready'));
});
