/**
 * Dobleuno · Validador del corpus
 *
 * Corta el pipeline si el corpus salió degenerado. Existe por un incidente
 * concreto: entre la Ola 2 y la Ola 11 el mirror bajó el shell de carga de
 * tow.whfb.app en vez de las páginas, y el parser produjo 39 "reglas" con el
 * mismo nombre ("Warhammer: The Old World Online Rules Index"), la misma
 * descripción ("No description available.") y todas en la misma categoría.
 *
 * El pipeline terminaba con exit 0 y nadie abrió el JSON durante dos meses.
 * Los chequeos de acá son exactamente los síntomas de ese caso: no miden
 * calidad editorial, miden que el corpus no sea basura uniforme.
 *
 * Uso:
 *   tsx scripts/validate-corpus.ts                 # valida data/processed/
 *   tsx scripts/validate-corpus.ts --translated    # valida data/translated/
 *   tsx scripts/validate-corpus.ts --min-rules=500
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Nombre del sitio: si aparece como nombre de una entrada, parseamos el header. */
const TITULO_DEL_SITIO = 'Warhammer: The Old World Online Rules Index';
const PLACEHOLDER_DESC = 'No description available.';

/** Pisos por defecto. Están bajos a propósito: detectan colapso, no completitud. */
const MIN_POR_DEFECTO = { rules: 100, items: 50, units: 50 };

export interface Hallazgo {
  nivel: 'error' | 'aviso';
  archivo: string;
  mensaje: string;
}

interface EntradaBase {
  id?: string;
  slug?: string;
  name?: string;
  text?: string;
  textEs?: string;
  ruleType?: string;
  cost?: number;
  [k: string]: unknown;
}

/** Cuántas veces aparece el valor más repetido de un campo. */
function maxRepetido(entradas: EntradaBase[], campo: string): { valor: string; n: number } {
  const cuenta = new Map<string, number>();
  for (const e of entradas) {
    const v = e[campo];
    if (typeof v !== 'string' || !v) continue;
    cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  }
  let mejor = { valor: '', n: 0 };
  for (const [valor, n] of cuenta) if (n > mejor.n) mejor = { valor, n };
  return mejor;
}

export function validarArchivo(
  nombre: string,
  entradas: EntradaBase[],
  minimo: number,
  opts: { traducido?: boolean } = {},
): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const err = (mensaje: string): void => {
    hallazgos.push({ nivel: 'error', archivo: nombre, mensaje });
  };
  const aviso = (mensaje: string): void => {
    hallazgos.push({ nivel: 'aviso', archivo: nombre, mensaje });
  };

  if (entradas.length === 0) {
    err('el archivo está vacío');
    return hallazgos;
  }
  if (entradas.length < minimo) {
    err(`solo ${entradas.length} entradas (mínimo esperado: ${minimo})`);
  }

  // 1. El síntoma exacto del incidente: el nombre del sitio como nombre de entrada.
  const conTitulo = entradas.filter((e) => e.name === TITULO_DEL_SITIO).length;
  if (conTitulo > 0) {
    err(`${conTitulo} entradas tienen como nombre el título del sitio — se parseó el header`);
  }

  const conPlaceholder = entradas.filter((e) => e.text === PLACEHOLDER_DESC).length;
  if (conPlaceholder > 0) {
    err(`${conPlaceholder} entradas con el texto placeholder "${PLACEHOLDER_DESC}"`);
  }

  // 2. Nombres repetidos en masa: otra forma del mismo colapso.
  const nombreRepetido = maxRepetido(entradas, 'name');
  if (entradas.length > 10 && nombreRepetido.n > entradas.length * 0.1) {
    err(
      `"${nombreRepetido.valor}" se repite ${nombreRepetido.n} veces ` +
        `(${((nombreRepetido.n / entradas.length) * 100).toFixed(0)}% del archivo)`,
    );
  }

  // 3. Campos vacíos.
  const sinNombre = entradas.filter((e) => !e.name?.trim()).length;
  if (sinNombre > 0) err(`${sinNombre} entradas sin nombre`);

  // Las unidades no tienen `text`: su contenido es el statline más los bloques
  // de equipo, reglas y opciones. Se las mide por ahí.
  const esUnidad = entradas.some((e) => Array.isArray(e.profile));
  const sinContenido = esUnidad
    ? entradas.filter((e) => {
        const perfil = e.profile;
        const tienePerfil = Array.isArray(perfil) && perfil.length > 0;
        const tieneBloques = ['equipment', 'specialRules', 'options'].some(
          (k) => typeof e[k] === 'string' && (e[k] as string).trim(),
        );
        return !tienePerfil && !tieneBloques;
      }).length
    : entradas.filter((e) => !e.text?.trim()).length;

  const etiqueta = esUnidad ? 'sin perfil ni bloques' : 'sin texto';
  if (sinContenido > entradas.length * 0.15) {
    err(
      `${sinContenido} entradas ${etiqueta} (${((sinContenido / entradas.length) * 100).toFixed(0)}%)`,
    );
  } else if (sinContenido > 0) {
    aviso(`${sinContenido} entradas ${etiqueta}`);
  }

  const sinSlug = entradas.filter((e) => !e.slug?.trim()).length;
  if (sinSlug > 0) err(`${sinSlug} entradas sin slug`);

  // 4. Taxonomía colapsada: el default sin mapear que tuvimos.
  if (entradas.some((e) => e.ruleType !== undefined)) {
    const tipos = new Set(entradas.map((e) => e.ruleType).filter(Boolean));
    if (tipos.size <= 1 && entradas.length > 20) {
      err(`todas las entradas comparten ruleType "${[...tipos][0] ?? '(vacío)'}"`);
    }
  }

  // 5. Costos: que TODOS sean 0 significa que no se leyó el campo.
  const conCosto = entradas.filter((e) => typeof e.cost === 'number');
  if (conCosto.length > 20 && conCosto.every((e) => e.cost === 0)) {
    err('todas las entradas tienen cost 0 — el campo no se está leyendo');
  }

  // 6. Slugs duplicados.
  const vistos = new Set<string>();
  const dup = new Set<string>();
  for (const e of entradas) {
    const s = e.slug ?? '';
    if (vistos.has(s)) dup.add(s);
    vistos.add(s);
  }
  if (dup.size > 0) err(`${dup.size} slugs duplicados (ej: ${[...dup].slice(0, 3).join(', ')})`);

  // 7. Traducción: que el español sea idéntico al inglés significa que no tradujo.
  if (opts.traducido) {
    const conTraduccion = entradas.filter((e) => typeof e.textEs === 'string' && e.textEs);
    if (conTraduccion.length === 0) {
      err('ninguna entrada tiene textEs');
    } else {
      const sinTraducir = conTraduccion.filter((e) => e.textEs === e.text).length;
      if (sinTraducir > conTraduccion.length * 0.1) {
        err(`${sinTraducir} entradas tienen textEs idéntico al inglés`);
      } else if (sinTraducir > 0) {
        aviso(`${sinTraducir} entradas con textEs idéntico al inglés`);
      }
    }
  }

  return hallazgos;
}

export function validarCorpus(dir: string, opts: { traducido?: boolean; minimos?: Partial<typeof MIN_POR_DEFECTO> } = {}): Hallazgo[] {
  const minimos = { ...MIN_POR_DEFECTO, ...opts.minimos };
  const archivos: Array<[string, number]> = [
    ['rules.json', minimos.rules],
    ['magic-items.json', minimos.items],
    ['units.json', minimos.units],
  ];

  const hallazgos: Hallazgo[] = [];
  for (const [nombre, minimo] of archivos) {
    const ruta = join(dir, nombre);
    if (!existsSync(ruta)) {
      hallazgos.push({ nivel: 'error', archivo: nombre, mensaje: 'no existe' });
      continue;
    }
    let entradas: EntradaBase[];
    try {
      entradas = JSON.parse(readFileSync(ruta, 'utf-8')) as EntradaBase[];
    } catch (err) {
      hallazgos.push({ nivel: 'error', archivo: nombre, mensaje: `JSON inválido: ${(err as Error).message}` });
      continue;
    }
    hallazgos.push(...validarArchivo(nombre, entradas, minimo, opts));
  }
  return hallazgos;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const traducido = argv.includes('--translated');
  const dir = join(ROOT, 'data', traducido ? 'translated' : 'processed');

  const minimos: Partial<typeof MIN_POR_DEFECTO> = {};
  for (const a of argv) {
    const m = /^--min-(rules|items|units)=(\d+)$/.exec(a);
    if (m?.[1] && m[2]) minimos[m[1] as keyof typeof MIN_POR_DEFECTO] = Number.parseInt(m[2], 10);
  }

  console.log(`[validate] Corpus: ${dir}`);
  const hallazgos = validarCorpus(dir, { traducido, minimos });

  const errores = hallazgos.filter((h) => h.nivel === 'error');
  const avisos = hallazgos.filter((h) => h.nivel === 'aviso');

  for (const h of avisos) console.warn(`  [aviso] ${h.archivo}: ${h.mensaje}`);
  for (const h of errores) console.error(`  [ERROR] ${h.archivo}: ${h.mensaje}`);

  if (errores.length > 0) {
    console.error(`\n[validate] ${errores.length} errores. El corpus no sirve para publicar.`);
    process.exit(1);
  }
  console.log(`[validate] OK${avisos.length > 0 ? ` (${avisos.length} avisos)` : ''}`);
}

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  });
}
