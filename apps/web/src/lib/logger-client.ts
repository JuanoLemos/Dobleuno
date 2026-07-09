/**
 * Logger minimalista para el cliente.
 * Solo consola por ahora; en Fase 2 podemos enviar a un endpoint de telemetría.
 */
function fmt(level: string, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] [${level.toUpperCase()}] ${msg}${metaStr}`;
}

export const log = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (import.meta.env.DEV) console.debug(fmt('debug', msg, meta));
  },
  info(msg: string, meta?: Record<string, unknown>) {
    console.info(fmt('info', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(fmt('warn', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>) {
    console.error(fmt('error', msg, meta));
  },
};
