/**
 * Copia los .sql de migración al dist, como parte del build.
 *
 * `tsc` sólo emite JavaScript: los `.sql` y el `meta/_journal.json` que el
 * migrator de Drizzle necesita se quedan en `src/` y nunca llegan al artefacto
 * compilado. Mientras las migraciones se corrían con `tsx` sobre `src/` eso no
 * se notaba; en el contenedor, que corre `node dist/`, significa que no hay
 * migraciones y la base queda sin crear.
 *
 * Va en el build y no en el Dockerfile a propósito: así `dist/` es
 * autosuficiente en todos lados, y el mismo comando que corre en producción se
 * puede probar local. Un paso que sólo existe en la imagen es un paso que sólo
 * se puede verificar en CI.
 */
import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'src', 'db', 'migrations');
const destino = join(raiz, 'dist', 'db', 'migrations');

if (!existsSync(origen)) {
  console.error(`[build] No existe ${origen}`);
  process.exit(1);
}

cpSync(origen, destino, { recursive: true });
console.log(`[build] migraciones → ${destino.replace(raiz, 'apps/server')}`);
