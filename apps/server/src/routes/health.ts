/**
 * Health check endpoint.
 * Devuelve 200 si el server está vivo, e info sobre la DB si está disponible.
 */
import { Router } from 'express';
import { isDbHealthy } from '../db/client.js';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_req, res) => {
  const dbHealthy = await isDbHealthy();
  res.json({
    status: 'ok',
    service: 'dobleuno-server',
    version: '0.2.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: dbHealthy ? 'up' : 'down',
    },
  });
});
