/**
 * Dobleuno · Diagnóstico de DeepSeek
 *
 * Responde una pregunta concreta: cuando el oráculo no contesta, ¿de quién es
 * la culpa — de la key, de la red, del proveedor o nuestra?
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Al verificar el seed de la Ola 11, `POST /api/ask` colgó y murió con
 * `UND_ERR_HEADERS_TIMEOUT`. Ese error es undici avisando que pasaron cinco
 * minutos sin headers de respuesta: NO distingue entre key inválida, red
 * cortada y proveedor caído. Lo único que prueba es que nadie puso un timeout.
 *
 * Este script recorre la cadena en orden, con timeout propio en cada paso, y
 * cada paso imprime su veredicto y su latencia. El primero que falla es la
 * causa; los de más abajo no se corren porque ya no significarían nada.
 *
 * Uso:
 *   npm run deepseek:doctor
 *   tsx scripts/deepseek-doctor.ts --verbose
 */

import { connect } from 'node:tls';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const VERBOSE = process.argv.includes('--verbose');

/** Timeout por paso. Corto a propósito: acá diagnosticamos, no esperamos. */
const TIMEOUT_MS = 20_000;
/** El chat sí puede tardar: es generación, no un handshake. */
const TIMEOUT_CHAT_MS = 45_000;

// ─── Carga de la key ──────────────────────────────────────────────────────

/**
 * Lee la key del entorno o del .env del server.
 *
 * No usa `dotenv/config` para no depender del cwd: el script tiene que poder
 * correrse desde la raíz o desde cualquier lado.
 */
function cargarKey(): { key: string; origen: string } | null {
  if (process.env.DEEPSEEK_API_KEY) {
    return { key: process.env.DEEPSEEK_API_KEY, origen: 'process.env' };
  }
  const env = join(ROOT, 'apps', 'server', '.env');
  if (!existsSync(env)) return null;
  for (const linea of readFileSync(env, 'utf-8').split('\n')) {
    const m = /^\s*DEEPSEEK_API_KEY\s*=\s*(.+?)\s*$/.exec(linea);
    if (m?.[1]) return { key: m[1].replace(/^["']|["']$/g, ''), origen: 'apps/server/.env' };
  }
  return null;
}

const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MODELO = process.env.DEEPSEEK_MODEL ?? 'deepseek-flash';

// ─── Presentación ─────────────────────────────────────────────────────────

let pasoN = 0;

function paso(titulo: string): void {
  pasoN++;
  process.stdout.write(`\n${pasoN}. ${titulo}\n`);
}

function ok(mensaje: string, ms?: number): void {
  console.log(`   ✓ ${mensaje}${ms !== undefined ? ` (${ms} ms)` : ''}`);
}

function fallo(mensaje: string, detalle?: string): never {
  console.error(`   ✗ ${mensaje}`);
  if (detalle) console.error(`     ${detalle}`);
  console.error('\nDiagnóstico: el primer paso que falla es la causa. Lo de abajo no se probó.');
  process.exit(1);
}

function aviso(mensaje: string): void {
  console.warn(`   ! ${mensaje}`);
}

async function cronometrar<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = Date.now();
  const r = await fn();
  return [r, Date.now() - t0];
}

/** Traduce los códigos de undici a algo accionable. */
function explicar(err: unknown): string {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = e.cause?.code ?? '';
  const mapa: Record<string, string> = {
    UND_ERR_HEADERS_TIMEOUT: 'el server aceptó la conexión pero no mandó headers a tiempo',
    UND_ERR_CONNECT_TIMEOUT: 'no se pudo establecer la conexión TCP',
    ENOTFOUND: 'el DNS no resuelve el host',
    ECONNREFUSED: 'el host rechazó la conexión',
    ECONNRESET: 'la conexión se cortó a mitad',
    CERT_HAS_EXPIRED: 'el certificado TLS del server está vencido',
    ETIMEDOUT: 'timeout de red',
  };
  const humano = mapa[code];
  return `${e.cause?.message ?? e.message ?? String(err)}${humano ? ` — ${humano}` : ''}`;
}

// ─── Pasos ────────────────────────────────────────────────────────────────

/** 1. ¿Hay key, y tiene la forma que DeepSeek usa? */
function verificarKey(): string {
  paso('Key configurada');
  const cargada = cargarKey();
  if (!cargada) {
    fallo(
      'No hay DEEPSEEK_API_KEY',
      'Exportala, o ponela en apps/server/.env (ver .env.example).',
    );
  }
  const { key, origen } = cargada;
  if (key.length < 20) fallo(`La key tiene ${key.length} caracteres: es demasiado corta`);
  if (!key.startsWith('sk-')) {
    aviso(`No empieza con "sk-" — puede ser válida igual, pero no es la forma habitual`);
  }
  ok(`${key.slice(0, 6)}… (${key.length} chars, desde ${origen})`);
  return key;
}

/** 2. ¿Se llega al host? Separa "no hay red" de "la API dice que no". */
async function verificarTls(): Promise<void> {
  paso(`Conectividad TLS a ${new URL(BASE_URL).host}`);
  const host = new URL(BASE_URL).hostname;
  const [cert, ms] = await cronometrar(
    () =>
      new Promise<{ valid_to?: string }>((resolver, rechazar) => {
        const socket = connect({ host, port: 443, servername: host, timeout: TIMEOUT_MS }, () => {
          const c = socket.getPeerCertificate();
          socket.end();
          resolver(c);
        });
        socket.on('timeout', () => {
          socket.destroy();
          rechazar(new Error(`timeout de ${TIMEOUT_MS} ms en el handshake`));
        });
        socket.on('error', rechazar);
      }),
  ).catch((e: Error) => {
    fallo('No se pudo establecer TLS', e.message);
  });
  ok(`handshake ok${cert.valid_to ? `, cert válido hasta ${cert.valid_to}` : ''}`, ms);
}

/** 3. GET /models — es lo que separa "key inválida" de "red caída". */
async function verificarAutenticacion(key: string): Promise<void> {
  paso('Autenticación (GET /models)');
  const [res, ms] = await cronometrar(() =>
    fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  ).catch((e: unknown) => {
    fallo('La request no llegó a completarse', explicar(e));
  });

  if (res.status === 401) fallo('401: la key es inválida o fue revocada');
  if (res.status === 402) {
    fallo('402: la cuenta no tiene crédito', 'Cargá saldo en platform.deepseek.com.');
  }
  if (res.status === 429) fallo('429: rate limit', 'Esperá y reintentá.');
  if (!res.ok) fallo(`HTTP ${res.status}`, (await res.text()).slice(0, 200));

  const data = (await res.json()) as { data?: Array<{ id: string }> };
  const modelos = (data.data ?? []).map((m) => m.id);
  ok(`key válida · modelos: ${modelos.join(', ') || '(la API no devolvió lista)'}`, ms);
  if (modelos.length > 0 && !modelos.includes(MODELO)) {
    aviso(`DEEPSEEK_MODEL="${MODELO}" no está en la lista`);
  }
}

/** 4. ¿La cuenta tiene con qué generar? Separa "sin saldo" de "no genera". */
async function verificarSaldo(key: string): Promise<void> {
  paso('Saldo de la cuenta');
  try {
    const [res, ms] = await cronometrar(() =>
      fetch(`${BASE_URL}/user/balance`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
    if (!res.ok) {
      aviso(`el endpoint de saldo devolvió HTTP ${res.status}; sigo igual`);
      return;
    }
    const data = (await res.json()) as {
      is_available?: boolean;
      balance_infos?: Array<{ currency: string; total_balance: string }>;
    };
    const saldos = (data.balance_infos ?? [])
      .map((b) => `${b.total_balance} ${b.currency}`)
      .join(', ');
    if (data.is_available === false) {
      fallo('La cuenta no está disponible', `Saldo: ${saldos || 'desconocido'}.`);
    }
    ok(`disponible · saldo ${saldos || 'desconocido'}`, ms);
  } catch (e) {
    aviso(`no se pudo consultar el saldo (${explicar(e)}); sigo igual`);
  }
}

/**
 * 5. Una generación mínima, cronometrada.
 *
 * El `AbortSignal` cubre la request ENTERA, cuerpo incluido — y distinguir
 * dónde se cortó es justamente el punto. Cuando DeepSeek está saturado manda
 * los headers con 200 en menos de un segundo y después sólo `: keep-alive`,
 * sin generar un token. Si el manejo de error envolviera únicamente al
 * `fetch`, ese caso saldría como "error inesperado" en vez de como lo que es.
 */
async function verificarChat(key: string): Promise<void> {
  paso(`Generación mínima (${MODELO})`);
  const t0 = Date.now();
  let headersMs = 0;

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODELO,
        messages: [{ role: 'user', content: 'Respondé sólo con la palabra: listo' }],
        // Suficiente para que el razonamiento no se coma la respuesta entera:
        // estos modelos descuentan los tokens de pensar del mismo presupuesto.
        max_tokens: 400,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(TIMEOUT_CHAT_MS),
    });
    headersMs = Date.now() - t0;

    if (!res.ok) fallo(`HTTP ${res.status}`, (await res.text()).slice(0, 300));

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: {
        total_tokens?: number;
        completion_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
      };
    };
    const ms = Date.now() - t0;
    const choice = data.choices?.[0];
    const texto = choice?.message?.content?.trim() ?? '';
    const razonando = data.usage?.completion_tokens_details?.reasoning_tokens ?? 0;

    if (!texto) {
      fallo(
        `La respuesta vino vacía (finish_reason: ${choice?.finish_reason ?? '?'})`,
        razonando > 0
          ? `El modelo gastó ${razonando} tokens razonando y no le quedaron para responder. ` +
              'Estos modelos descuentan el razonamiento del mismo max_tokens.'
          : JSON.stringify(data).slice(0, 200),
      );
    }

    // El reparto importa: es lo que dimensiona el max_tokens del resto del código.
    const reparto = razonando > 0 ? ` · ${razonando} razonando` : '';
    ok(`"${texto}" · ${data.usage?.completion_tokens ?? '?'} tokens${reparto}`, ms);

    if (ms > 20_000) {
      aviso(`${ms} ms para 10 tokens. Con 2547 entradas, la traducción sería inviable.`);
    }
  } catch (e) {
    // Headers rápidos y después nada: el proveedor aceptó y se quedó colgado.
    if (headersMs > 0 && headersMs < 5_000) {
      fallo(
        `Aceptó (headers en ${headersMs} ms) pero no generó en ${TIMEOUT_CHAT_MS} ms`,
        [
          'La key, el saldo y la red están bien: es DeepSeek el que no responde.',
          'Se ve igual con curl: HTTP 200 y sólo ": keep-alive" hasta el timeout.',
          'No hay nada que arreglar de este lado. Reintentá más tarde.',
        ].join('\n     '),
      );
    }
    fallo('La generación no completó', explicar(e));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('DeepSeek — diagnóstico');
  console.log(`base URL: ${BASE_URL}`);

  const key = verificarKey();
  await verificarTls();
  await verificarAutenticacion(key);
  await verificarSaldo(key);
  await verificarChat(key);

  console.log('\nTodo en orden: la key sirve, el proveedor responde y el modelo genera.');
  console.log('Si el oráculo igual falla, el problema está de este lado (ver lib/rag.ts).');
  if (VERBOSE) console.log(`\nmodelo=${MODELO} timeout=${TIMEOUT_MS}/${TIMEOUT_CHAT_MS} ms`);
}

main().catch((err: unknown) => {
  console.error('\nError inesperado en el diagnóstico:', explicar(err));
  process.exit(1);
});
