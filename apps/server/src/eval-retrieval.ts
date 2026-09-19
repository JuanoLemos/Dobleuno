/**
 * Dobleuno · Medidor de calidad del retrieval del oráculo
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * El oráculo contesta siempre. Con los chunks equivocados contesta igual: el
 * LLM recibe cinco unidades Tomb Kings, no encuentra nada sobre Killing Blow,
 * y responde con educación que no tiene información suficiente. HTTP 200,
 * citas válidas, cero errores en el log. La única forma de ver que está roto
 * es leer la respuesta y saber la respuesta correcta de antemano.
 *
 * Este script hace eso a escala y devuelve un número. Sin número, cualquier
 * cambio al retrieval es una opinión: no se puede decir si mejoró, ni cuánto,
 * ni si algo que andaba dejó de andar.
 *
 * ── Qué mide ─────────────────────────────────────────────────────────────
 *
 * Sólo la recuperación, no la respuesta. No llama al LLM, así que no gasta
 * API y corre en segundos. Si el chunk correcto no entra en el top-5, el
 * mejor modelo del mundo no puede contestar bien: el retrieval es el techo de
 * todo lo que venga después.
 *
 *   recall@1   la respuesta correcta salió primera
 *   recall@5   entró en los 5 que ve el LLM (es el límite real de `ask`)
 *   MRR        1/posición, promediado: premia estar arriba, no sólo entrar
 *
 * ── El set de preguntas ──────────────────────────────────────────────────
 *
 * Están escritas como las escribiría un jugador en la mesa, en castellano
 * rioplatense, no como una consulta de base de datos. Mezclan tres formas
 * deliberadamente: el nombre exacto de la regla, el nombre adentro de una
 * pregunta, y la descripción del efecto sin nombrarla. Esa última columna es
 * la que separa una búsqueda semántica de una coincidencia de palabras.
 *
 * Uso:
 *   tsx src/eval-retrieval.ts          # tabla + métricas
 *   tsx src/eval-retrieval.ts --fallos # sólo lo que falla, con qué trajo
 */
import { getEmbeddingProvider } from './lib/embeddings.js';
import { retrieveChunks } from './lib/rag.js';
import { pool } from './db/client.js';

interface Caso {
  pregunta: string;
  /** El chunk que tendría que salir primero. */
  esperado: string;
  /**
   * `exacta`   el nombre de la regla, tal cual
   * `pregunta` el nombre adentro de una frase
   * `efecto`   describe qué hace, sin nombrarla — acá se ve lo semántico
   */
  forma: 'exacta' | 'pregunta' | 'efecto';
}

const CASOS: Caso[] = [
  // ── El nombre exacto ──
  { pregunta: 'Killing Blow', esperado: 'chunk-rule-killing-blow', forma: 'exacta' },
  { pregunta: 'Flaming Attacks', esperado: 'chunk-rule-flaming-attacks', forma: 'exacta' },
  { pregunta: 'Poisoned Attacks', esperado: 'chunk-rule-poisoned-attacks', forma: 'exacta' },
  { pregunta: 'Stubborn', esperado: 'chunk-rule-stubborn', forma: 'exacta' },
  { pregunta: 'Swiftstride', esperado: 'chunk-rule-swiftstride', forma: 'exacta' },
  { pregunta: 'Frenzy', esperado: 'chunk-rule-frenzy', forma: 'exacta' },

  // ── El nombre adentro de una pregunta ──
  {
    pregunta: '¿cómo funciona Killing Blow?',
    esperado: 'chunk-rule-killing-blow',
    forma: 'pregunta',
  },
  {
    pregunta: '¿qué pasa cuando una unidad falla el Break Test?',
    esperado: 'chunk-rule-break-test',
    forma: 'pregunta',
  },
  {
    pregunta: 'una unidad con Stubborn, ¿cómo chequea la moral?',
    esperado: 'chunk-rule-stubborn',
    forma: 'pregunta',
  },
  {
    pregunta: '¿los Flaming Attacks afectan a las bestias de guerra?',
    esperado: 'chunk-rule-flaming-attacks',
    forma: 'pregunta',
  },
  {
    pregunta: '¿Frenzy me obliga a cargar?',
    esperado: 'chunk-rule-frenzy',
    forma: 'pregunta',
  },

  // ── El efecto, sin nombrar la regla ──
  {
    pregunta: 'saqué un 6 para herir y el modelo muere sin tirar salvación de armadura',
    esperado: 'chunk-rule-killing-blow',
    forma: 'efecto',
  },
  {
    pregunta: 'mi unidad tiene que hacer un chequeo de moral y no puede huir',
    esperado: 'chunk-rule-stubborn',
    forma: 'efecto',
  },
  {
    pregunta: 'ataques que prenden fuego y asustan a las bestias',
    esperado: 'chunk-rule-flaming-attacks',
    forma: 'efecto',
  },
  {
    pregunta: 'tirar 3D6 y descartar el dado más bajo al cargar o huir',
    esperado: 'chunk-rule-swiftstride',
    forma: 'efecto',
  },
];

const LIMITE = 5;

interface Resultado {
  caso: Caso;
  /** Posición 1-based del chunk esperado, o 0 si no entró. */
  posicion: number;
  trajo: string[];
}

async function medir(): Promise<Resultado[]> {
  const provider = getEmbeddingProvider();
  const salida: Resultado[] = [];

  for (const caso of CASOS) {
    const vec = await provider.embed(caso.pregunta);
    const { chunks } = await retrieveChunks({
      questionVec: vec,
      pregunta: caso.pregunta,
      limit: LIMITE,
      expectedDims: provider.dims,
      providerSemantico: provider.name !== 'deterministic',
    });
    const ids = chunks.map((c) => c.id);
    salida.push({ caso, posicion: ids.indexOf(caso.esperado) + 1, trajo: ids });
  }
  return salida;
}

function porcentaje(n: number, total: number): string {
  return `${((n / total) * 100).toFixed(0)}%`.padStart(4);
}

async function main(): Promise<void> {
  const soloFallos = process.argv.includes('--fallos');
  const provider = getEmbeddingProvider();
  console.log(`[eval] provider: ${provider.name} (${provider.dims} dims) · top-${LIMITE}\n`);

  const resultados = await medir();

  for (const r of resultados) {
    const ok = r.posicion === 1 ? '✓' : r.posicion > 0 ? `${r.posicion}º` : '✗';
    if (soloFallos && r.posicion === 1) continue;
    console.log(`  ${ok.padEnd(3)} [${r.caso.forma.padEnd(8)}] ${r.caso.pregunta}`);
    if (r.posicion !== 1) {
      console.log(`        esperaba: ${r.caso.esperado}`);
      console.log(`        trajo:    ${r.trajo.join(', ') || '(nada)'}`);
    }
  }

  const total = resultados.length;
  const r1 = resultados.filter((r) => r.posicion === 1).length;
  const r5 = resultados.filter((r) => r.posicion > 0).length;
  const mrr = resultados.reduce((s, r) => s + (r.posicion > 0 ? 1 / r.posicion : 0), 0) / total;

  console.log(`\n  recall@1  ${porcentaje(r1, total)}  (${r1}/${total})`);
  console.log(`  recall@5  ${porcentaje(r5, total)}  (${r5}/${total})`);
  console.log(`  MRR       ${mrr.toFixed(3)}`);

  // Por forma de pregunta: el desglose dice DÓNDE falla, que es lo que
  // orienta el arreglo. Un retrieval léxico acierta las exactas y falla las
  // de efecto; uno semántico roto falla las tres por igual.
  console.log('\n  por forma de pregunta:');
  for (const forma of ['exacta', 'pregunta', 'efecto'] as const) {
    const grupo = resultados.filter((r) => r.caso.forma === forma);
    const aciertos = grupo.filter((r) => r.posicion > 0).length;
    console.log(
      `    ${forma.padEnd(9)} recall@5 ${porcentaje(aciertos, grupo.length)}  (${aciertos}/${grupo.length})`,
    );
  }

  await pool.end();
}

await main();
