/**
 * Ola 12 — Lo que producción exige y desarrollo no.
 *
 * ── Por qué estos tests ──────────────────────────────────────────────────
 *
 * Los guards de esta ola son todos de la misma familia: impiden que el sistema
 * arranque, o siga, en un estado que *parece* sano. Un refactor que los borre
 * no rompe ninguna funcionalidad — por eso hace falta afirmarlos.
 *
 * `env.ts` se importa con `await import()` adentro de cada caso, porque valida
 * al cargarse: hay que setear process.env antes, y volver a importarlo con el
 * módulo reseteado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL = { ...process.env };

/** Carga env.ts desde cero con el entorno dado. Devuelve null si mató el proceso. */
async function cargarEnv(vars: Record<string, string | undefined>): Promise<unknown> {
  vi.resetModules();
  process.env = { ...ORIGINAL, ...vars };

  // env.ts hace process.exit(1) cuando la validación falla.
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('__exit__');
  });
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    const mod = (await import('../env.js')) as { env: unknown };
    return mod.env;
  } catch (e) {
    if ((e as Error).message === '__exit__') return null;
    throw e;
  } finally {
    exit.mockRestore();
    error.mockRestore();
  }
}

/** Un entorno de producción completo y válido, al que cada caso le rompe una cosa. */
const PROD_OK: Record<string, string | undefined> = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://u:p@db.interno:5432/dobleuno',
  BETTER_AUTH_SECRET: 'una-clave-de-produccion-de-mas-de-32-chars',
  BETTER_AUTH_URL: 'https://dobleuno.example.ar',
  DEEPSEEK_API_KEY: 'sk-real',
  OPENAI_API_KEY: undefined,
  CORS_ORIGIN: '',
};

describe('env — exigencias de producción', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('acepta una configuración de producción completa', async () => {
    expect(await cargarEnv(PROD_OK)).not.toBeNull();
  });

  it('rechaza el secreto de ejemplo, que pasa cualquier regla de longitud', async () => {
    // 35 caracteres: superaba el min(16) sin problema. Por eso hay lista negra.
    expect(
      await cargarEnv({ ...PROD_OK, BETTER_AUTH_SECRET: 'change-me-in-production-min-32-chars' }),
    ).toBeNull();
  });

  it('rechaza el otro placeholder, el que traía el propio schema', async () => {
    expect(
      await cargarEnv({
        ...PROD_OK,
        BETTER_AUTH_SECRET: 'dev-secret-change-me-min-32-chars-recommended',
      }),
    ).toBeNull();
  });

  it('rechaza una base en localhost', async () => {
    expect(
      await cargarEnv({ ...PROD_OK, DATABASE_URL: 'postgres://u:p@localhost:5432/dobleuno' }),
    ).toBeNull();
  });

  it('rechaza un origen público en localhost', async () => {
    expect(await cargarEnv({ ...PROD_OK, BETTER_AUTH_URL: 'http://localhost:3000' })).toBeNull();
  });

  it('exige DEEPSEEK_API_KEY: sin ella el oráculo devuelve un mock', async () => {
    expect(await cargarEnv({ ...PROD_OK, DEEPSEEK_API_KEY: undefined })).toBeNull();
  });

  it('rechaza OPENAI_API_KEY: rompe los embeddings en silencio', async () => {
    expect(await cargarEnv({ ...PROD_OK, OPENAI_API_KEY: 'sk-openai' })).toBeNull();
  });

  it('en desarrollo no exige nada de eso', async () => {
    // Los defaults permisivos siguen donde sirven.
    expect(await cargarEnv({ NODE_ENV: 'development', ...{} })).not.toBeNull();
  });

  it('CORS_ORIGIN vacío es válido: significa mismo origen', async () => {
    expect(await cargarEnv({ ...PROD_OK, CORS_ORIGIN: '' })).not.toBeNull();
  });
});

describe('embeddings — guard de dimensiones', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('tira si el provider no matchea la columna vector(384)', async () => {
    process.env = { ...ORIGINAL, OPENAI_API_KEY: 'sk-openai' };
    const { getEmbeddingProvider, setEmbeddingProvider } = await import('../lib/embeddings.js');
    setEmbeddingProvider(null);
    // OpenAI da 1536 y la columna es 384: sin este guard, el seed llena la
    // tabla de NULLs y el oráculo deja de encontrar nada, sin un solo error.
    expect(() => getEmbeddingProvider()).toThrow(/1536 dimensiones/);
  });

  it('usa el determinístico cuando no hay key', async () => {
    process.env = { ...ORIGINAL, OPENAI_API_KEY: undefined };
    const { getEmbeddingProvider, setEmbeddingProvider, EMBEDDING_DIMS } = await import(
      '../lib/embeddings.js'
    );
    setEmbeddingProvider(null);
    expect(getEmbeddingProvider().dims).toBe(EMBEDDING_DIMS);
  });
});

describe('LLM — el mock no puede correr en producción', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.resetModules();
  });

  it('tira en producción sin DEEPSEEK_API_KEY', async () => {
    vi.resetModules();
    // Se carga con un entorno de producción válido —env.ts exige la key al
    // boot— y recién después se la saca. Eso es justamente lo que este guard
    // cubre: que la key desaparezca o se relaje el schema más adelante.
    process.env = { ...ORIGINAL, ...PROD_OK };
    const { callLLM } = await import('../lib/llm-helper.js');
    delete process.env.DEEPSEEK_API_KEY;

    // El mock devuelve prosa con citas inventadas y HTTP 200: indistinguible
    // de una respuesta real para el usuario y para nuestras verificaciones.
    await expect(callLLM({ system: 's', user: 'u' })).rejects.toThrow(/no se usa el mock/);
  });

  it('en dev devuelve el mock, que es para lo que existe', async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NODE_ENV: 'development', DEEPSEEK_API_KEY: undefined };
    const { callLLM } = await import('../lib/llm-helper.js');
    await expect(callLLM({ system: 's', user: 'u' })).resolves.toBeTypeOf('string');
  });
});
