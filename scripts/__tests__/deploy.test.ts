/**
 * Tests estáticos de los artefactos de deploy.
 *
 * ── Por qué existen ──────────────────────────────────────────────────────
 *
 * El Dockerfile de este proyecto nunca se construyó con éxito: llamaba a un
 * script inexistente (`npm run build -w @dobleuno/shared`) y fallaba siempre.
 * Nadie se enteró durante meses porque nada lo ejercitaba, y como en esta
 * máquina no hay Docker, cada hipótesis sobre el archivo cuesta un push y
 * cinco minutos de CI.
 *
 * Estos tests no reemplazan al `docker build` —eso corre en CI— pero atrapan
 * antes del push la clase de error que más cuesta: rutas que no existen,
 * scripts que no existen, y variables que están en un lado y no en el otro.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function leer(rel: string): string {
  return readFileSync(join(RAIZ, rel), 'utf-8');
}

/** El archivo sin comentarios: los comentarios citan comandos de ejemplo. */
function sinComentarios(texto: string): string {
  return texto
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
}

describe('Dockerfile', () => {
  const dockerfile = leer('apps/server/Dockerfile');

  /** Las rutas de `COPY <origen> <destino>` que salen del repo, no de un stage. */
  const origenesDelRepo = dockerfile
    .split('\n')
    .filter((l) => /^COPY\s/.test(l.trim()) && !l.includes('--from='))
    .flatMap((l) => l.trim().replace(/^COPY\s+/, '').split(/\s+/).slice(0, -1));

  it('copia sólo rutas que existen en el repo', () => {
    const faltantes = origenesDelRepo.filter((r) => r !== './' && !existsSync(join(RAIZ, r)));
    expect(faltantes).toEqual([]);
  });

  it('copia el package.json de todos los workspaces del lockfile', () => {
    // Sin el de web, `npm ci` queda desincronizado: el lockfile lo declara.
    for (const ws of ['apps/server', 'apps/web', 'packages/shared']) {
      expect(origenesDelRepo).toContain(`${ws}/package.json`);
    }
  });

  it('sólo corre scripts npm que existen', () => {
    const invocados = [
      ...sinComentarios(dockerfile).matchAll(/npm run (\S+) -w (\S+)/g),
    ].map((m) => ({
      script: m[1]!,
      workspace: m[2]!,
    }));
    expect(invocados.length).toBeGreaterThan(0);

    const carpetas: Record<string, string> = {
      '@dobleuno/server': 'apps/server',
      '@dobleuno/web': 'apps/web',
      '@dobleuno/shared': 'packages/shared',
    };
    for (const { script, workspace } of invocados) {
      const carpeta = carpetas[workspace];
      expect(carpeta, `workspace desconocido: ${workspace}`).toBeDefined();
      const pkg = JSON.parse(leer(`${carpeta!}/package.json`)) as {
        scripts?: Record<string, string>;
      };
      // Este es el test que hubiera ahorrado la Ola 12 entera.
      expect(
        pkg.scripts?.[script],
        `${workspace} no declara el script "${script}"`,
      ).toBeDefined();
    }
  });

  it('lleva a la imagen los node_modules que npm dejó anidados', () => {
    // npm no hoistea todo a la raíz: con conflicto de versiones deja paquetes
    // adentro del workspace que los pide. Este proyecto tiene 15 así, incluidos
    // `dotenv` y `openai`. Copiar sólo /app/node_modules dejaba al contenedor
    // muriendo en el primer import, y eso sólo se veía construyendo la imagen.
    const lock = JSON.parse(leer('package-lock.json')) as { packages: Record<string, unknown> };
    const anidados = new Set(
      Object.keys(lock.packages)
        .filter((k) => /^(apps|packages)\/[^/]+\/node_modules\//.test(k))
        .map((k) => k.slice(0, k.indexOf('/node_modules/'))),
    );

    // `COPY --from=<stage> <origen> <destino>`: el origen es el tercer token.
    const copiadas = sinComentarios(dockerfile)
      .split('\n')
      .filter((l) => /^COPY\s+--from=/.test(l.trim()))
      .map((l) => l.trim().split(/\s+/)[2]!);

    // `COPY --from=<stage> /app ./` cubre cualquier anidamiento presente y
    // futuro, que es la razón de copiar el árbol entero.
    const copiaTodo = copiadas.some((c) => /\/app\/?$/.test(c));
    for (const ws of anidados) {
      expect(
        copiaTodo || copiadas.some((c) => c.includes(`${ws}/node_modules`)),
        `${ws}/node_modules no llega a la imagen`,
      ).toBe(true);
    }
  });

  it('el healthcheck apunta a readiness, no a liveness', () => {
    // /api/health devuelve 200 aunque la base esté caída: un contenedor sin
    // Postgres quedaría `healthy` para siempre.
    const health = /HEALTHCHECK[\s\S]*?CMD ([^\n]+)/.exec(dockerfile)?.[1] ?? '';
    expect(health).toContain('/api/health/ready');
  });

  it('buildea el cliente con la API en el mismo origen', () => {
    expect(dockerfile).toMatch(/ENV VITE_API_URL=""/);
    expect(dockerfile).toMatch(/npm run build -w @dobleuno\/web/);
    expect(dockerfile).toMatch(/ENV WEB_DIST_DIR=/);
  });
});

describe('.dockerignore', () => {
  const ignorados = leer('.dockerignore')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  it('excluye la documentación con el nombre real del directorio', () => {
    // Decía `docs` y el directorio es `doc`, en singular: la regla no excluía
    // nada y los 200+ KB de markdown entraban al contexto del build.
    expect(ignorados).toContain('doc');
    expect(ignorados).not.toContain('docs');
    expect(existsSync(join(RAIZ, 'doc'))).toBe(true);
  });

  it('mantiene el corpus y los dist fuera del contexto', () => {
    // `data/` no puede entrar a la imagen: doc/Sources.md dice que el corpus
    // no se redistribuye, y publicar la imagen sería redistribuirlo.
    expect(ignorados).toContain('data/');
    expect(ignorados).toContain('**/dist');
  });
});

describe('configuración de producción', () => {
  const ejemplo = leer('.env.production.example');
  const compose = leer('docker-compose.yml');
  const envTs = leer('apps/server/src/env.ts');

  /** Nombres de variable declarados en el schema Zod del server. */
  const delSchema = [...envTs.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s/gm)].map((m) => m[1]!);

  it('el schema declara las variables que el deploy necesita', () => {
    for (const v of ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'WEB_DIST_DIR', 'KB_DATA_DIR']) {
      expect(delSchema).toContain(v);
    }
  });

  it('cada variable del compose está documentada en .env.production.example', () => {
    // Es el chequeo que evita otro WEB_DIST_DIR: una variable que el código
    // lee, el compose no pasa y el ejemplo no menciona.
    const delCompose = [...compose.matchAll(/\$\{([A-Z][A-Z0-9_]+)[:?}-]/g)].map((m) => m[1]!);
    const sinDocumentar = [...new Set(delCompose)].filter(
      (v) => !new RegExp(`^#?\\s*${v}=`, 'm').test(ejemplo),
    );
    expect(sinDocumentar).toEqual([]);
  });

  it('no trae un secreto de ejemplo que pase la validación', () => {
    // El default del compose ("change-me-in-production-min-32-chars") tenía 35
    // caracteres: pasaba el min(16) y el server arrancaba con él.
    const secreto = /^BETTER_AUTH_SECRET=(.*)$/m.exec(ejemplo)?.[1] ?? '';
    expect(secreto.trim()).toBe('');
    expect(compose).not.toMatch(/BETTER_AUTH_SECRET:\s*\$\{[^}]*:-/);
  });

  it('no publica Postgres fuera de loopback', () => {
    const puertos = [...compose.matchAll(/^\s*-\s*'([^']*5432[^']*)'/gm)].map((m) => m[1]!);
    for (const p of puertos) expect(p).toMatch(/^127\.0\.0\.1:/);
  });
});
