/**
 * App de Express con middlewares y rutas.
 * Exporta `createApp()` para que los tests puedan instanciarla sin listen().
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { env } from './env.js';
import { log } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { rulesRouter } from './routes/rules.js';
import { listsRouter } from './routes/lists.js';
import { battlesRouter } from './routes/battles.js';
import { askRouter } from './routes/ask.js';
import { adminKbRouter } from './routes/admin-kb.js';
import { accountRouter } from './routes/account.js';
import { clubRouter } from './routes/club.js';
import { mesasRouter } from './routes/mesas.js';
import { sesionesRouter } from './routes/sesiones.js';
import { reservasRouter } from './routes/reservas.js';

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
  app.use('/api/battles', battlesRouter);
  app.use('/api/ask', askRouter);
  app.use('/api/admin/kb', adminKbRouter);
  app.use('/api/club', clubRouter);
  app.use('/api/mesas', mesasRouter);
  app.use('/api/sesiones', sesionesRouter);
  app.use('/api', reservasRouter);
  app.use('/api', accountRouter);
  app.use('/api', rulesRouter);

  // Ola 11 — Servir el cliente React (Vite build) desde el mismo server.
  // En dev local, el dist vive en `apps/web/dist` (relativo a este archivo).
  // En Docker, se monta como volumen en /app/web-dist (configurable por env).
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const WEB_DIST = process.env.WEB_DIST_DIR
    ? path.resolve(process.env.WEB_DIST_DIR)
    : path.resolve(__dirname, '../../web/dist');

  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    // SPA fallback: cualquier ruta que NO sea /api/* devuelve el index.html
    // para que React Router tome el control del routing client-side.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(WEB_DIST, 'index.html'));
    });
    log.info(`Serving web dist from ${WEB_DIST}`);
  } else {
    log.warn(`Web dist not found at ${WEB_DIST} — only API will be served. Build the web first (npm run build:web).`);
  }

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
