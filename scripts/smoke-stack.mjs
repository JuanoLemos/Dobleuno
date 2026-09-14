/**
 * Smoke test del stack levantado: API + SPA en el mismo origen.
 *
 * ── Por qué afirma sobre el cuerpo y no sobre el status ──────────────────
 *
 * Un smoke test que sólo mira códigos HTTP pasa con el stack roto:
 *
 *   · `GET /` devuelve 200 desde un index.html al que no se le copió el JS.
 *   · `GET /api/rules/sections` devuelve 200 con el index.html adentro si el
 *     orden de los `app.use` cambia y el fallback del SPA se come la API.
 *   · `GET /api/health` devuelve 200 con la base caída — por eso se consulta
 *     `/ready`, que responde 503.
 *
 * Los tres son verdes mirando el status. Por eso acá cada aserción dice qué
 * espera del content-type y del contenido.
 *
 * Uso:
 *   node scripts/smoke-stack.mjs [base-url]
 */
const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

let fallos = 0;

async function afirmar(nombre, path, comprobar) {
  let res;
  let cuerpo = '';
  try {
    res = await fetch(BASE + path, { signal: AbortSignal.timeout(15_000) });
    cuerpo = await res.text();
  } catch (e) {
    console.log(`  ✗ ${nombre}: la request falló — ${e.message}`);
    fallos++;
    return;
  }
  const ct = res.headers.get('content-type') ?? '';
  let problema;
  try {
    problema = comprobar({ status: res.status, ct, cuerpo });
  } catch (e) {
    problema = `la aserción tiró: ${e.message}`;
  }
  if (problema) {
    console.log(`  ✗ ${nombre}: ${problema}`);
    fallos++;
  } else {
    console.log(`  ✓ ${nombre} (${res.status}, ${ct.split(';')[0]})`);
  }
}

console.log(`Smoke del stack en ${BASE}`);

// El SPA se sirve de verdad: no alcanza con el 200.
await afirmar('GET / sirve el SPA', '/', ({ status, ct, cuerpo }) =>
  status !== 200
    ? `status ${status}`
    : !ct.includes('text/html')
      ? `content-type ${ct}`
      : !cuerpo.includes('<div id="root"')
        ? 'el HTML no tiene el mount point del cliente'
        : !/<script[^>]+src="[^"]*\.js"/.test(cuerpo)
          ? 'el index no referencia ningún bundle JS'
          : null,
);

// Una ruta de React Router: prueba que el fallback funciona.
await afirmar('GET /reglas cae al SPA', '/reglas', ({ status, ct, cuerpo }) =>
  status !== 200
    ? `status ${status}`
    : !ct.includes('text/html')
      ? `content-type ${ct}`
      : !cuerpo.includes('<div id="root"')
        ? 'no devolvió el index'
        : null,
);

// Y que el fallback NO se comió la API.
await afirmar('GET /api/rules/sections es JSON', '/api/rules/sections', ({ status, ct }) =>
  ![200, 503].includes(status)
    ? `status ${status}`
    : !ct.includes('application/json')
      ? `content-type ${ct} — el fallback del SPA se comió la API`
      : null,
);

// Readiness con la base arriba.
await afirmar('GET /api/health/ready', '/api/health/ready', ({ status, cuerpo }) => {
  const d = JSON.parse(cuerpo);
  return status !== 200
    ? `status ${status} (database: ${d.dependencies?.database})`
    : d.dependencies?.database !== 'up'
      ? 'la base no está up'
      : d.version === '0.2.0'
        ? 'la versión sigue hardcodeada en 0.2.0'
        : null;
});

// Un 404 de la API tiene que ser JSON, no el index.
await afirmar('GET /api/no-existe da 404 JSON', '/api/no-existe', ({ status, ct }) =>
  status !== 404
    ? `status ${status}`
    : !ct.includes('application/json')
      ? `content-type ${ct}`
      : null,
);

if (fallos > 0) {
  console.error(`\n${fallos} aserciones fallaron.`);
  process.exitCode = 1;
} else {
  console.log('\nStack ok: la API y el cliente conviven en el mismo origen.');
}
