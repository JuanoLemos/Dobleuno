/**
 * Dobleuno · Normalizador de glosario del corpus traducido
 *
 * ── El problema que arregla ──────────────────────────────────────────────
 *
 * `translate-tow.ts` manda las 2547 entradas al LLM en lotes de 5 a 8. Cada
 * lote es una conversación independiente: no sabe qué decidieron los otros, y
 * el prompt fija qué NO traducir pero no fija cómo se llama cada regla. El
 * resultado es que una misma regla especial termina con un nombre en su ficha
 * y otro distinto cada vez que otra ficha la cita.
 *
 * Medido sobre las primeras 720 reglas traducidas, "Flaming Attacks" quedó así:
 *
 *     ficha propia             "Ataques Ígneos"
 *     citada en 31 fichas →    24x "Flaming Attacks" (sin traducir)
 *                               5x "Ataques Flamígeros"
 *                               4x "Ataques Ígneos"   ← las únicas coherentes
 *                               1x "Ataques de Fuego"
 *
 * Ninguna de las cinco está mal en castellano. El problema es que un Codex
 * necesita UN nombre por regla: el jugador lee "Ataques Flamígeros" en una
 * ficha, lo busca, y no existe — está guardada como "Ataques Ígneos". La
 * referencia cruzada no conecta, que es justo para lo que sirve un Codex.
 *
 * ── Por qué es un paso aparte y no un prompt mejor ───────────────────────
 *
 * Arreglarlo en el prompt significa un glosario fijo inyectado en cada lote y
 * retraducir las 2547 entradas: otra corrida completa de API pagada. Esto es
 * determinístico, cuesta cero, y se puede revisar entrada por entrada antes de
 * aplicarlo.
 *
 * ── La autoridad ─────────────────────────────────────────────────────────
 *
 * El nombre canónico de una regla es el `nameEs` de SU PROPIA ficha. No es una
 * elección de este script: es el único que el Codex muestra como título y el
 * único contra el que matchea el buscador.
 *
 * ── Lo que NO hace ───────────────────────────────────────────────────────
 *
 * No inventa traducciones ni toca una cita que no pueda resolver contra el
 * glosario. Las que no resuelve las reporta, no las adivina: colapsar dos
 * reglas distintas en una sería peor que la inconsistencia que arregla.
 *
 * Uso:
 *   tsx scripts/normalizar-glosario.ts              # reporte, no escribe nada
 *   tsx scripts/normalizar-glosario.ts --apply      # aplica y deja backup
 *   tsx scripts/normalizar-glosario.ts --dir=data/translated.tmp
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Los archivos del corpus que tienen `nameEs` / `textEs`. `units.json` no se traduce. */
const ARCHIVOS = ['rules.json', 'magic-items.json'] as const;

export interface EntradaTraducida {
  id: string;
  name: string;
  text: string;
  nameEs: string;
  textEs: string;
  [k: string]: unknown;
}

export interface Termino {
  /** El nombre en inglés, tal como lo cita el texto original. */
  en: string;
  /** El nombre canónico: el `nameEs` de su propia ficha. */
  es: string;
  /** El id de la ficha que manda. */
  id: string;
}

export interface Reemplazo {
  entradaId: string;
  termino: string;
  de: string;
  a: string;
  /** 'ingles' = quedó sin traducir; 'variante' = se tradujo distinto. */
  clase: 'ingles' | 'variante';
}

export interface SinResolver {
  entradaId: string;
  termino: string;
  canonico: string;
  motivo: 'sin-candidata' | 'ambigua' | 'canonico-en-ingles' | 'parte-de-nombre-mas-largo';
}

/**
 * Nombres demasiado genéricos para buscarlos como palabra suelta en un texto
 * en castellano: aparecen dentro de frases normales y producirían reemplazos
 * absurdos. Se reportan igual, pero no se tocan automáticamente.
 */
const DEMASIADO_GENERICOS = new Set([
  'fly',
  'move',
  'march',
  'charge',
  'shoot',
  'fire',
  'attacks',
  'wounds',
  'rally',
  'flee',
  'hold',
  'push',
  'general',
  'unit',
  'model',
  'save',
  'magic',
  'cost',
]);

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ¿La ocurrencia es un nombre completo, o el pedazo de uno más largo?
 *
 * El corpus tiene nombres de regla que empiezan con otro nombre de regla, y el
 * glosario no los conoce a todos: `Armour` es una ficha, `Armour Bane` no está
 * traducida todavía. Sin este chequeo, las 59 menciones de "Armour Bane (1)" y
 * "Armour Piercing" en los perfiles de arma se convertían en "Armadura Bane
 * (1)" — un término que no existe, escrito con toda confianza y sin un error.
 *
 * La señal es tipográfica y alcanza: si pegada al match hay otra palabra en
 * mayúscula sin puntuación en el medio, estamos viendo un nombre más largo. Un
 * punto, una coma o un paréntesis cierran el nombre; un espacio no.
 *
 * Ante la duda no reemplaza y lo reporta. Una cita sin unificar se ve; una
 * cita mal unificada, no.
 */
function esNombreCompleto(texto: string, inicio: number, fin: number): boolean {
  const antes = texto.slice(Math.max(0, inicio - 40), inicio);
  const despues = texto.slice(fin, fin + 40);
  if (/[A-ZÁÉÍÓÚÑ][\wáéíóúñü'-]*[ \t]+$/.test(antes)) return false;
  if (/^[ \t]+[A-ZÁÉÍÓÚÑ][\wáéíóúñü'-]*/.test(despues)) return false;
  return true;
}

/**
 * Construye el glosario a partir de las fichas.
 *
 * Sólo entran los términos que alguna OTRA ficha cita en su texto en inglés:
 * un nombre que nadie menciona no puede estar inconsistente en ningún lado.
 */
export function construirGlosario(entradas: EntradaTraducida[]): Termino[] {
  const candidatos = entradas
    .filter((e) => (e.name ?? '').trim().length >= 4 && (e.nameEs ?? '').trim().length > 0)
    .map((e) => ({ en: e.name.trim(), es: e.nameEs.trim(), id: e.id }));

  // Un mismo nombre en inglés con dos fichas distintas es ambiguo: no hay
  // canónico posible, así que queda afuera en vez de elegir uno al azar.
  const vecesEn = new Map<string, number>();
  for (const c of candidatos) {
    const k = c.en.toLowerCase();
    vecesEn.set(k, (vecesEn.get(k) ?? 0) + 1);
  }

  const textoIngles = entradas.map((e) => ({ id: e.id, text: e.text ?? '' }));

  return candidatos
    .filter((c) => vecesEn.get(c.en.toLowerCase()) === 1)
    .filter((c) => !DEMASIADO_GENERICOS.has(c.en.toLowerCase()))
    .filter((c) => {
      const patron = new RegExp(`\\b${escaparRegex(c.en)}\\b`, 'i');
      return textoIngles.some((t) => t.id !== c.id && patron.test(t.text));
    })
    // Primero los nombres largos: "Flaming Attacks" antes que "Attacks", para
    // que el reemplazo corto no se coma la mitad del largo.
    .sort((a, b) => b.en.length - a.en.length);
}

/** La primera palabra del nombre canónico ("Ataques Ígneos" → "Ataques"). */
function cabeza(es: string): string {
  return es.split(/\s+/)[0] ?? '';
}

/**
 * Calcula los reemplazos de una entrada y devuelve el texto ya normalizado.
 *
 * Dos pasadas, y la diferencia importa:
 *
 *   A · El nombre quedó literalmente en inglés dentro del texto en castellano.
 *       Es un match exacto contra el glosario, sin interpretación posible.
 *       Fue el 77% de los casos medidos.
 *
 *   B · El nombre se tradujo, pero distinto que en su ficha. Acá hay que
 *       identificar cuál de las frases del texto es la cita, así que sólo se
 *       acepta una candidata que comparta la palabra cabeza con el canónico y
 *       venga en mayúsculas — las dos señales juntas de que es un nombre de
 *       regla y no prosa. Todo lo demás se reporta sin tocar.
 *
 * El guardarraíl central es `ajenos`: nunca se pisa una frase que sea el
 * nombre canónico de OTRA regla. Si una ficha cita "Flaming Attacks" y su
 * texto dice "Ataques Envenenados", eso habla de Poisoned Attacks y tocarlo
 * fusionaría dos reglas distintas — peor que la inconsistencia original.
 */
export function normalizarEntrada(
  entrada: EntradaTraducida,
  glosario: Termino[],
): { textoEs: string; reemplazos: Reemplazo[]; sinResolver: SinResolver[] } {
  const reemplazos: Reemplazo[] = [];
  const sinResolver: SinResolver[] = [];
  const ingles = entrada.text ?? '';
  let texto = entrada.textEs ?? '';

  const ajenosPorTermino = new Map<string, Set<string>>();
  for (const t of glosario) {
    const s = new Set<string>();
    for (const otro of glosario) if (otro.en !== t.en) s.add(otro.es.toLowerCase());
    ajenosPorTermino.set(t.en, s);
  }

  for (const termino of glosario) {
    if (termino.id === entrada.id) continue;

    // Que el ORIGINAL cite el término es lo que prueba que la mención es real.
    // Sin este chequeo, cualquier coincidencia de palabras en castellano
    // dispararía un reemplazo.
    if (!new RegExp(`\\b${escaparRegex(termino.en)}\\b`, 'i').test(ingles)) continue;

    const esTraducido = termino.es.toLowerCase() !== termino.en.toLowerCase();

    // ── Pasada A: quedó en inglés ──
    if (esTraducido) {
      let hubo = false;
      let saltadas = 0;
      texto = texto.replace(
        new RegExp(`\\b${escaparRegex(termino.en)}\\b`, 'g'),
        (match, desplazamiento: number, completo: string) => {
          if (!esNombreCompleto(completo, desplazamiento, desplazamiento + match.length)) {
            saltadas++;
            return match;
          }
          hubo = true;
          return termino.es;
        },
      );
      if (hubo) {
        reemplazos.push({
          entradaId: entrada.id,
          termino: termino.en,
          de: termino.en,
          a: termino.es,
          clase: 'ingles',
        });
        continue;
      }
      if (saltadas > 0) {
        sinResolver.push({
          entradaId: entrada.id,
          termino: termino.en,
          canonico: termino.es,
          motivo: 'parte-de-nombre-mas-largo',
        });
        continue;
      }
    }

    if (new RegExp(`\\b${escaparRegex(termino.es)}\\b`, 'i').test(texto)) continue;

    // ── Pasada B: se tradujo distinto ──
    const cab = cabeza(termino.es);
    if (!esTraducido) {
      // El canónico es el nombre inglés y el texto no lo tiene: alguien lo
      // tradujo y no hay palabra cabeza en castellano contra la cual buscar.
      sinResolver.push({
        entradaId: entrada.id,
        termino: termino.en,
        canonico: termino.es,
        motivo: 'canonico-en-ingles',
      });
      continue;
    }
    if (cab.length < 4) {
      sinResolver.push({
        entradaId: entrada.id,
        termino: termino.en,
        canonico: termino.es,
        motivo: 'sin-candidata',
      });
      continue;
    }

    const ajenos = ajenosPorTermino.get(termino.en) ?? new Set<string>();
    // `[ \t]`, no `\s`: el corpus conserva los saltos de línea del original —
    // separan el perfil de un arma de su texto— y `\s` los cruzaba. Así la
    // última palabra de una línea y la primera de la siguiente formaban una
    // "variante" inventada: "Mercenarios\nHasta", "Frenesí\nOdio". Aplicarla
    // habría pegado dos oraciones en una.
    const patronVariante = new RegExp(
      `\\b${escaparRegex(cab)}(?:[ \\t]+(?:de|del|de[ \\t]+la)[ \\t]+[A-ZÁÉÍÓÚÑ]|[ \\t]+[A-ZÁÉÍÓÚÑ])[\\wáéíóúñüÁÉÍÓÚÑÜ]*`,
      'g',
    );
    const candidatas = [...new Set(texto.match(patronVariante) ?? [])].filter(
      (c) => !ajenos.has(c.toLowerCase()) && c.toLowerCase() !== termino.es.toLowerCase(),
    );

    const unica = candidatas.length === 1 ? candidatas[0] : undefined;
    if (unica !== undefined) {
      texto = texto.replace(new RegExp(escaparRegex(unica), 'g'), termino.es);
      reemplazos.push({
        entradaId: entrada.id,
        termino: termino.en,
        de: unica,
        a: termino.es,
        clase: 'variante',
      });
    } else {
      // Cero candidatas (la cita se perdió del todo) o varias (ambiguo). En
      // los dos casos el script no tiene con qué decidir, y no inventa.
      sinResolver.push({
        entradaId: entrada.id,
        termino: termino.en,
        canonico: termino.es,
        motivo: candidatas.length === 0 ? 'sin-candidata' : 'ambigua',
      });
    }
  }

  return { textoEs: texto, reemplazos, sinResolver };
}

export interface Resultado {
  entradas: EntradaTraducida[];
  reemplazos: Reemplazo[];
  sinResolver: SinResolver[];
}

/**
 * ── El techo de este método, medido ──────────────────────────────────────
 *
 * Sobre el corpus completo, "Flaming Attacks" pasó de 4 citas coherentes sobre
 * 31 a 89 sobre 93. Las 4 que quedan son el límite del algoritmo, no un bug:
 *
 *     "· Ataques Extra (+1), Ataques Flamígeros, Ataques Mágicos"
 *
 * Hay dos frases candidatas que empiezan con "Ataques" y no son canónicas de
 * otra regla, así que el script no elige. Repetir la pasada no ayuda: dos
 * términos que comparten la palabra cabeza ven exactamente el mismo conjunto
 * de candidatas, así que o se resuelven las dos o ninguna — no hay orden que
 * desempate. Romperlo pide alinear por posición contra el texto en inglés, que
 * es otro método y con otro riesgo: emparejar mal en vez de abstenerse.
 *
 * Quedan sin unificar y se reportan. Es el 4% de un término, no una cadena
 * rota en silencio.
 */
export function normalizar(entradas: EntradaTraducida[], glosario: Termino[]): Resultado {
  const reemplazos: Reemplazo[] = [];
  const sinResolver: SinResolver[] = [];
  const salida = entradas.map((e) => {
    const r = normalizarEntrada(e, glosario);
    reemplazos.push(...r.reemplazos);
    sinResolver.push(...r.sinResolver);
    return { ...e, textEs: r.textoEs };
  });
  return { entradas: salida, reemplazos, sinResolver };
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function leer(ruta: string): EntradaTraducida[] {
  return JSON.parse(readFileSync(ruta, 'utf-8')) as EntradaTraducida[];
}

/**
 * Unifica las etiquetas de la línea de perfil de un arma.
 *
 * ── Qué son y por qué las tratamos aparte ────────────────────────────────
 *
 * "Range", "Strength" y "AP" no salen del sitio: las escribe `parse-tow.ts`
 * al aplanar el perfil embebido de un arma. Son estructura nuestra, no
 * contenido. Pero viajan adentro del texto que va al traductor, así que el
 * modelo las traduce como cualquier otra palabra — y como cada lote es
 * independiente, las traduce distinto:
 *
 *     300x  Alcance / Fuerza / AP      ← lo que quedó en la mayoría
 *      46x  Range   / Strength / AP
 *      15x  Alcance / Strength / AP
 *       1x  Range   / Fuerza  / AP
 *
 * El normalizador de glosario no las puede tocar: no hay ficha "Range" de la
 * que sacar un canónico. Por eso van acá, con una tabla fija.
 *
 * ── Por qué se matchea el triple entero y no cada etiqueta suelta ────────
 *
 * Porque las mismas palabras son prosa legítima en otras partes del corpus:
 *
 *     "sufre un impacto con mayor Fuerza y Penetración de Armadura"
 *     "los modificadores de Fuerza y Perforación de armadura de una Cathayan Longsword"
 *
 * Reemplazar "Penetración" suelta reescribiría esas oraciones. Exigir las tres
 * etiquetas con sus valores y sus comas —la forma exacta que produce el
 * parser— no aparece nunca en prosa: la prosa las une con "y", no con coma.
 *
 * El canónico de cada una es la forma mayoritaria, que además deja `AP`, que
 * es la notación del reglamento en los perfiles.
 */
// El `:?` no es cosmético: 12 perfiles salieron como "Alcance: Combate,
// Strength S, AP -1". El modelo agrega dos puntos que el parser no emite, y
// sin contemplarlos el patrón no matcheaba justo las líneas que peor estaban.
// Al absorberlos, la forma también queda igual en todo el corpus.
const PERFIL_DE_ARMA =
  /\b(Alcance|Range|Distancia):?(\s+[^,\n]{1,20},\s*)(Fuerza|Strength):?(\s+[^,\n]{1,15},\s*)(AP|Penetración|Perforación):?\b/g;

/**
 * El otro perfil que emite el parser: hechizos ligados, con alcance y tipo en
 * vez de fuerza y penetración ("· Range 24", Type Bound Spell ·").
 *
 * Son 7 casos, 6 de ellos con la etiqueta en inglés — o sea que acá la mayoría
 * quedó al revés que en el triple. Se unifica igual a "Alcance" y "Tipo": el
 * campo `range` tiene que verse igual en todo el corpus, no distinto según qué
 * campo tenga al lado.
 */
const PERFIL_DE_HECHIZO = /\b(Alcance|Range):?(\s+[^,\n]{1,20},\s*)(Tipo|Type):?(\s)/g;

export function unificarEtiquetasDePerfil(texto: string): { texto: string; cambios: number } {
  let cambios = 0;
  let salida = texto.replace(PERFIL_DE_ARMA, (match, _a, valA: string, _b, valB: string) => {
    const nuevo = `Alcance${valA}Fuerza${valB}AP`;
    if (nuevo !== match) cambios++;
    return nuevo;
  });
  salida = salida.replace(PERFIL_DE_HECHIZO, (match, _a, valA: string, _b, sep: string) => {
    const nuevo = `Alcance${valA}Tipo${sep}`;
    if (nuevo !== match) cambios++;
    return nuevo;
  });
  return { texto: salida, cambios };
}

export interface OpcionesDirectorio {
  /** Sin esto no escribe nada: sólo reporta lo que haría. */
  aplicar?: boolean;
  /** Deja `<archivo>.pre-glosario` antes de sobrescribir. */
  backup?: boolean;
  silencioso?: boolean;
}

export interface ResumenDirectorio {
  fichas: number;
  terminos: number;
  reemplazos: Reemplazo[];
  sinResolver: SinResolver[];
  /** Perfiles de arma cuyas etiquetas se unificaron. */
  etiquetas: number;
}

/**
 * Normaliza el corpus de un directorio. Es lo que llama `rules-sync.ts`.
 *
 * Corre sobre el STAGING, antes de validar y promover, por la misma razón por
 * la que el traductor escribe ahí: los archivos finales se regeneran enteros
 * en cada sync a partir del cache, que guarda el texto crudo del LLM. Una
 * normalización hecha a mano sobre `data/translated/` la borra el próximo
 * `npm run rules:sync` sin decir nada, y el Codex vuelve solo a tener cinco
 * nombres para la misma regla.
 */
export function normalizarDirectorio(
  dir: string,
  opciones: OpcionesDirectorio = {},
): ResumenDirectorio | null {
  const { aplicar = false, backup = false, silencioso = false } = opciones;
  const log = (m: string): void => {
    if (!silencioso) console.log(m);
  };

  const presentes = ARCHIVOS.filter((a) => existsSync(join(dir, a)));
  if (presentes.length === 0) {
    console.error(`[glosario] No hay corpus traducido en ${dir}.`);
    return null;
  }

  // El glosario se arma con TODAS las fichas juntas: las reglas se citan entre
  // sí y los items mágicos citan reglas, así que separarlos por archivo
  // dejaría la mitad de las referencias cruzadas sin canónico.
  const porArchivo = new Map<string, EntradaTraducida[]>();
  for (const a of presentes) porArchivo.set(a, leer(join(dir, a)));
  const todas = [...porArchivo.values()].flat();

  const glosario = construirGlosario(todas);
  log(`[glosario] ${todas.length} fichas · ${glosario.length} términos citados`);

  const reemplazos: Reemplazo[] = [];
  const sinResolver: SinResolver[] = [];
  let etiquetas = 0;
  for (const [archivo, entradas] of porArchivo) {
    const r = normalizar(entradas, glosario);
    reemplazos.push(...r.reemplazos);
    sinResolver.push(...r.sinResolver);

    const finales = r.entradas.map((e) => {
      const p = unificarEtiquetasDePerfil(e.textEs ?? '');
      etiquetas += p.cambios;
      return p.cambios > 0 ? { ...e, textEs: p.texto } : e;
    });

    if (aplicar) {
      const destino = join(dir, archivo);
      if (backup) copyFileSync(destino, `${destino}.pre-glosario`);
      writeFileSync(destino, JSON.stringify(finales, null, 2), 'utf-8');
    }
    log(
      `[glosario] ${archivo}: ${r.reemplazos.length} citas unificadas` +
        (aplicar ? '' : ' (simulado)'),
    );
  }
  if (etiquetas > 0) log(`[glosario] ${etiquetas} perfiles de arma con etiquetas unificadas`);

  return { fichas: todas.length, terminos: glosario.length, reemplazos, sinResolver, etiquetas };
}

function main(): void {
  const argv = process.argv.slice(2);
  const aplicar = argv.includes('--apply');
  const dirArg = argv.find((a) => a.startsWith('--dir='));
  const dir = resolve(ROOT, dirArg ? dirArg.slice('--dir='.length) : join('data', 'translated'));

  // Toda la lógica vive en `normalizarDirectorio`, que es lo que llama el
  // pipeline. Este main sólo reporta.
  //
  // Antes repetía el loop entero acá, y esa copia se quedó atrás: cuando se
  // sumó la unificación de etiquetas de perfil, el pipeline la corría y el
  // comando suelto no. Dos caminos para el mismo trabajo divergen apenas uno
  // de los dos cambia, y el que queda viejo no falla: hace de menos, callado.
  const r = normalizarDirectorio(dir, { aplicar, backup: true });
  if (!r) {
    process.exitCode = 1;
    return;
  }

  const porTermino = new Map<string, Map<string, number>>();
  for (const rep of r.reemplazos) {
    const m = porTermino.get(rep.termino) ?? new Map<string, number>();
    const forma = `${rep.de} → ${rep.a}`;
    m.set(forma, (m.get(forma) ?? 0) + 1);
    porTermino.set(rep.termino, m);
  }

  const total = (formas: Map<string, number>): number =>
    [...formas.values()].reduce((x, y) => x + y, 0);
  const ordenados = [...porTermino.entries()].sort((a, b) => total(b[1]) - total(a[1]));

  console.log(`\nTérminos unificados (${ordenados.length}):\n`);
  for (const [termino, formas] of ordenados.slice(0, 40)) {
    console.log(`  ${termino} — ${total(formas)} citas`);
    for (const [forma, n] of [...formas.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(n).padStart(3)}x  ${forma}`);
    }
  }

  const motivos = new Map<string, number>();
  for (const s of r.sinResolver) motivos.set(s.motivo, (motivos.get(s.motivo) ?? 0) + 1);
  console.log(`\nSin resolver (${r.sinResolver.length}) — se reportan, no se tocan:`);
  for (const [m, n] of motivos) console.log(`  ${String(n).padStart(4)}  ${m}`);

  // Qué referencias cruzadas quedan rotas, ordenadas por cuánto duelen. Es la
  // lista de lo que este paso NO arregló, y tenerla es la diferencia entre una
  // deuda conocida y una que se descubre en la mesa.
  const porTerminoSR = new Map<string, number>();
  for (const s of r.sinResolver) porTerminoSR.set(s.termino, (porTerminoSR.get(s.termino) ?? 0) + 1);
  const top = [...porTerminoSR.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (top.length > 0) {
    console.log('\n  Los que más citas dejan sin unificar:');
    for (const [t, n] of top) console.log(`    ${String(n).padStart(3)}x  ${t}`);
  }

  console.log(
    `\n${r.reemplazos.length} citas y ${r.etiquetas} perfiles ` +
      `${aplicar ? 'unificados' : 'unificables'}.` +
      (aplicar ? ' Backups en *.pre-glosario' : ' Corré con --apply para escribir.'),
  );
}

// Sólo corre como CLI; importado desde los tests no ejecuta nada.
if (process.argv[1] !== undefined && import.meta.url.endsWith('normalizar-glosario.ts')) {
  const invocadoDirecto = process.argv[1].endsWith('normalizar-glosario.ts');
  if (invocadoDirecto) main();
}
