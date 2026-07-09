/**
 * Bootstrap del server.
 * Levanta Express, monta middlewares y rutas, escucha en el puerto configurado.
 */
import { env } from './env.js';
import { createApp } from './app.js';
import { log } from './lib/logger.js';
import { ensureAdmins } from './scripts/promote-admin.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  log.info(`Dobleuno server listening on http://localhost:${env.PORT}`, {
    env: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
  });
});

// Ola 7.1 — Promover admins por env var (no bloquea el arranque).
ensureAdmins().catch((err) => {
  log.error('ensureAdmins failed', { error: (err as Error).message });
});

// Graceful shutdown
function shutdown(signal: string): void {
  log.info(`Received ${signal}, shutting down...`);
  server.close(() => {
    log.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    log.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
