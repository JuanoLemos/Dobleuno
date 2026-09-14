# ADR-012 — Topología de un contenedor y despliegue consolidado

| Campo | Valor |
|---|---|
| **Decisión** | Un solo contenedor sirve la API y el cliente desde el mismo origen. El corpus se copia al volumen; no viaja en la imagen. |
| **Estado** | Aceptado |
| **Fecha** | 2026-09-14 |
| **Ola** | 12 (Deploy consolidado) |
| **Impacto** | Un VPS, un `docker compose`, sin CORS en producción. La imagen es genérica: no está atada a un dominio. |

## Contexto

El ROADMAP pedía "deploy unificado (app + landing)". Al relevarlo apareció que **el stack no
levantaba**, y que nunca había levantado: `apps/server/Dockerfile` corría
`npm run build -w @dobleuno/shared`, un script que `packages/shared` no declara. El `docker build`
fallaba en esa línea desde que el archivo se escribió.

Nadie se enteró porque CI no tocaba Docker y en la máquina del autor no hay Docker instalado. Detrás
de ese bloqueante había otros tres que también impedían arrancar, y cuatro cadenas que fallaban
**en verde**: el sistema respondía 200, el seed salía con exit 0, y lo que tenía que funcionar no
funcionaba.

## Decisión

### 1. Un contenedor, un origen

Express sirve `/api/*` y el SPA desde el mismo puerto. El compose tiene tres servicios: `postgres`,
`migrate` (one-shot) y `server`.

*Alternativa descartada:* cliente en Cloudflare Pages + API en el VPS. Es más rápido para el usuario
final y el hosting del estático es gratis, pero obliga a manejar CORS, cookies cross-site para
better-auth y un `_redirects` para el SPA. Para un club con un VPS, ese costo no se paga solo.

**Consecuencia aceptada:** con el SPA horneado en la imagen, las `VITE_*` quedan congeladas al
construir. Por eso `VITE_API_URL` va **vacío** — las requests salen relativas al origen — y la
imagen sirve para cualquier dominio. Si esa variable llevara un host, la imagen sería específica de
ese host y cambiar de dominio exigiría reconstruir.

### 2. Las migraciones son un servicio, no un paso manual ni un entrypoint

`migrate` usa la misma imagen, corre `node apps/server/dist/db/migrate.js` y sale. `server` depende
de `service_completed_successfully`.

*Por qué no un entrypoint:* una migración fallida daría crash-loop y el error se perdería entre
reintentos. Como servicio one-shot queda un contenedor exited con código ≠ 0 y los logs intactos.

*Por qué no a mano:* era lo que hacía `deploy.md`, y es exactamente por eso que nadie descubrió que
el comando documentado no funcionaba — apuntaba a `dist/db/migrate.js` desde `/app`, con los `.sql`
fuera de la imagen y `tsx` podado por el prune.

Los `.sql` se copian al `dist` **en el build del server**, no en el Dockerfile: así `dist/` es
autosuficiente en todos lados y el mismo comando que corre en producción se puede probar local. Un
paso que sólo existe en la imagen es un paso que sólo se puede verificar en CI.

`0001_pgvector.sql` se aplica desde el Pool de `pg` que el migrator ya tiene abierto, no con `psql`:
`node:22-alpine` no trae el binario, y sumar `postgresql-client` es meter un paquete y un shell más
en producción para un `CREATE EXTENSION` idempotente.

### 3. El corpus se copia al volumen; no viaja en la imagen

`doc/Sources.md` dice que el contenido de tow.whfb.app no se redistribuye. Una imagen con el corpus
adentro es redistribución en cuanto se publica a un registry — la decisión es de licencia, no de
tamaño.

`/api/admin/kb/sync` tampoco sirve para esto: carga los scripts del pipeline por dynamic import de
archivos `.ts`, que Node no puede importar sin `tsx` y que no se copian a la imagen. En esta ola
sólo se lo hizo **fallar con honestidad**, con un mensaje que explica qué hacer en su lugar.

El procedimiento es `docker compose cp` de `data/translated/` (2,9 MB) más un `run --rm` del seed.

### 4. Producción exige lo que desarrollo no

Hasta ahora **ninguna** variable era obligatoria: el server levantaba con el secreto de ejemplo, sin
API key y apuntando a un Postgres de localhost, sin una sola queja. El docblock de `env.ts` decía
"falla rápido en boot si falta algo crítico" y no se cumplía para ningún valor.

Con `NODE_ENV=production` hay un `superRefine` que exige base y origen público que no sean
localhost, `DEEPSEEK_API_KEY`, y un `BETTER_AUTH_SECRET` de 32+ caracteres **que no esté en una
lista negra**. La lista hace falta: el default del compose tenía 35 caracteres, así que ninguna
regla de longitud lo podía atrapar.

**`OPENAI_API_KEY` está prohibida en producción.** Ese provider devuelve 1536 dimensiones contra una
columna `vector(384)`: el trigger no podía castear, la excepción se degradaba a `RAISE WARNING`, las
3700 filas quedaban con `embedding_vec` NULL, el retrieval filtraba `IS NOT NULL` y matcheaba cero.
El oráculo contestaba "no tengo información suficiente" a todo, con el seed saliendo 0, la tabla
mostrando 3700 filas y el health en 200. Hay tres guards contra eso porque uno solo vuelve a fallar
en silencio.

## Consecuencias

### Positivas

- Un VPS, un `docker compose up`, sin CORS ni cookies cross-site.
- La imagen es genérica: el mismo artefacto sirve para cualquier dominio.
- Un deploy mal configurado **no arranca**, y dice qué falta.
- El `docker build` y un smoke del stack corren en CI: es el único lugar donde se pueden verificar.

### Negativas

- Rebuild de la imagen para cambiar el cliente, aunque sólo cambie un texto.
- Todo en un proceso: no hay escalado horizontal. El mutex de `kb-sync` es in-memory, así que dos
  réplicas se pisarían.
- El corpus es un paso manual del deploy. Es el precio de no redistribuirlo.

### Verificación, y su límite

CI construye la imagen, levanta el compose y afirma sobre el **cuerpo y el content-type** de cinco
endpoints, más dos consultas SQL contra la base del contenedor. Afirmar sobre el status no alcanza:
`GET /` devuelve 200 desde un `index.html` sin JS, y `/api/rules/sections` devolvería 200 con el
`index.html` adentro si el fallback del SPA se comiera la API.

**La imagen nunca se probó fuera de CI.** No hay Docker en la máquina del autor y esta ola no
incluyó un servidor real. Eso queda escrito también en `deploy.md` y en el CHANGELOG.

## Reversibilidad

Volver a dos orígenes es rehacer la Decisión 1: un `_redirects`, CORS, y `VITE_API_URL` con el host
de la API. Nada de lo hecho acá lo impide. Lo que no se puede deshacer barato es la exigencia de
configuración: si algún deploy dependía de los defaults permisivos, va a dejar de arrancar — que es
exactamente el punto.
