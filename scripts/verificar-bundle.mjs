/**
 * Verifica que el bundle del cliente no tenga una URL absoluta de API adentro.
 *
 * ── Por qué es un gate y no una inspección ───────────────────────────────
 *
 * La topología de producción es un solo origen, así que el cliente se buildea
 * con `VITE_API_URL=""` y las requests salen relativas. Si esa variable se
 * pierde —o si el schema de `apps/web/src/lib/env.ts` vuelve a rechazar el
 * string vacío, que es lo que pasaba hasta la Ola 12— el bundle sale apuntando
 * a `http://localhost:3000` **sin un solo warning**.
 *
 * Y el smoke test del contenedor no lo atrapa: en CI el stack corre en
 * localhost:3000, así que un bundle mal armado funciona igual. El error
 * aparece recién en el servidor de verdad, que es el peor lugar posible.
 *
 * Los sourcemaps quedan afuera a propósito: contienen el texto fuente, donde
 * "localhost" aparece en comentarios y en strings de dependencias.
 *
 * Uso:
 *   node scripts/verificar-bundle.mjs [dist-dir]
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(process.argv[2] ?? join(raiz, 'apps', 'web', 'dist'));

/** Lo que no puede estar en el JS servido. */
const PROHIBIDO = [/https?:\/\/localhost(:\d+)?/i, /https?:\/\/127\.0\.0\.1(:\d+)?/i];

function archivosJs(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivosJs(ruta));
    else if (entrada.endsWith('.js')) salida.push(ruta);
  }
  return salida;
}

if (!existsSync(dist)) {
  console.error(`[bundle] No existe ${dist}. Corré antes: npm run build:web`);
  process.exit(1);
}

const hallazgos = [];
for (const archivo of archivosJs(dist)) {
  const texto = readFileSync(archivo, 'utf-8');
  for (const patron of PROHIBIDO) {
    const m = patron.exec(texto);
    if (m) hallazgos.push({ archivo: archivo.replace(dist, 'dist'), encontrado: m[0] });
  }
}

if (hallazgos.length > 0) {
  console.error('[bundle] El cliente tiene URLs absolutas de desarrollo adentro:\n');
  for (const h of hallazgos) console.error(`  ${h.archivo} → ${h.encontrado}`);
  console.error(
    '\nEl build tiene que correr con VITE_API_URL="" para que las requests sean\n' +
      'relativas al origen. Revisá también apps/web/src/lib/env.ts.',
  );
  process.exit(1);
}

console.log(`[bundle] ok — ${archivosJs(dist).length} archivos JS, sin URLs absolutas de dev`);
