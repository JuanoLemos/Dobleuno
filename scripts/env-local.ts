/**
 * Carga `apps/server/.env` en `process.env` para los scripts del pipeline.
 *
 * ── Por qué hace falta ───────────────────────────────────────────────────
 *
 * Los scripts de `scripts/` viven fuera de los workspaces, así que `dotenv` no
 * les carga nada solo, y el `.env` del proyecto está en `apps/server/`. El
 * traductor leía `process.env.DEEPSEEK_API_KEY` al importarse y moría con
 * "DEEPSEEK_API_KEY no configurada" salvo que la exportaras a mano — o sea que
 * `npm run rules:sync` nunca fue ejecutable tal como está documentado.
 *
 * Se descubrió en la primera corrida real de la traducción, después de meses
 * de que el comando figurara en el README.
 *
 * Lo que ya está en el entorno gana: exportar la variable sigue funcionando, y
 * CI no depende de que exista el archivo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Los .env que se miran, en orden. El primero que exista gana por variable. */
const CANDIDATOS = [join(RAIZ, '.env'), join(RAIZ, 'apps', 'server', '.env')];

function parsear(contenido: string): Record<string, string> {
  const salida: Record<string, string> = {};
  // Se corta por CRLF o LF, no sólo por LF.
  //
  // Los .env de este repo están en CRLF (Windows), y con `split('\n')` cada
  // línea queda con un `\r` colgando. En JavaScript `.` no matchea `\r` y `$`
  // sin flag `m` exige el fin del string, así que un patrón `(.*)$` falla en
  // TODAS las líneas menos la última — la única sin retorno de carro. Este
  // parser leía una sola variable de las diez del archivo, y justo no era la
  // que hacía falta.
  for (const linea of contenido.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linea);
    if (!m?.[1]) continue;
    // Comilla simple o doble alrededor del valor, si la hay.
    salida[m[1]] = (m[2] ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return salida;
}

/** Devuelve de qué archivo se cargó algo, para poder decirlo en los logs. */
export function cargarEnvLocal(): string | null {
  let origen: string | null = null;
  for (const ruta of CANDIDATOS) {
    if (!existsSync(ruta)) continue;
    for (const [k, v] of Object.entries(parsear(readFileSync(ruta, 'utf-8')))) {
      // El entorno real manda: esto sólo rellena lo que falta.
      if (process.env[k] === undefined) {
        process.env[k] = v;
        origen ??= ruta.replace(RAIZ, '.');
      }
    }
  }
  return origen;
}
