/**
 * Logger minimalista. Reemplazable por Pino/Winston en Fase 2 si hace falta.
 */
import { env } from '../env.js';

const levels: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40 };
type Level = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: Level): boolean {
  return (levels[level] ?? 0) >= (levels[env.LOG_LEVEL] ?? 0);
}

function fmt(level: Level, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] [${level.toUpperCase()}] ${msg}${metaStr}`;
}

export const log = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) console.debug(fmt('debug', msg, meta));
  },
  info(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) console.info(fmt('info', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(fmt('warn', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(fmt('error', msg, meta));
  },
};
