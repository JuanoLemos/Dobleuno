/**
 * App de Express con middlewares y rutas.
 * Exporta `createApp()` para que los tests puedan instanciarla sin listen().
 */
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { env } from './env.js';
import { log } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { rulesRouter } from './routes/rules.js';
import { listsRouter } from './routes/lists.js';

export function createApp(): Express {
  const app = express();

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging (minimalista)
  app.use((req, _res, next) => {
    log.debug(`${req.method} ${req.path}`);
    next();
  });

  // Rutas
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/lists', listsRouter);
  app.use('/api', rulesRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    log.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
