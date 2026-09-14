# Walkthrough — Ola 12: Deploy consolidado

**Fecha:** 2026-09-14 20:00 · **Comando:** `/plan` → implementación por fases · **Modelo:** Claude Opus 5

---

## Qué se hizo

El ROADMAP pedía "deploy unificado (app + landing)". Al relevarlo apareció que **el stack no
levantaba, y nunca había levantado**: `apps/server/Dockerfile:32` corría
`npm run build -w @dobleuno/shared`, un script que `packages/shared` no declara. El `docker build`
fallaba ahí desde que el archivo se escribió.

Nadie se enteró por dos razones que se refuerzan: CI no tocaba Docker, y en esta máquina no hay
Docker instalado. Detrás de ese bloqueante había otros tres que también impedían arrancar, y cuatro
cadenas que fallaban **en verde**.

La restricción ordenó todo el trabajo: **CI es el único lugar donde la imagen se puede verificar**,
y cada hipótesis cuesta un push. El contrapeso es que hay WSL2 con Postgres nativo, así que
migraciones, seed, retrieval y el SPA servido por Express se verifican local. Cada cosa se probó en
el lugar más barato donde se podía.

## Cambios aplicados

| Fase | Qué |
|---|---|
| 3 (primero) | `deepseek-doctor` · timeouts en el cliente y en `/api/ask` · modelo actualizado |
| 1 | Dockerfile · migraciones dentro del contenedor · web en la imagen · URL relativa · job `docker` en CI |
| 2 | `superRefine` de producción · guard de dimensiones (3 capas) · mock del LLM prohibido · `/ready` · compose endurecido · traductor |
| 4 | `tsconfig.json` en la raíz · `scripts/` a lint y typecheck |
| 6 | ADR-012 · `deploy.md` reescrito · CHANGELOG · ROADMAP · RELEASING · status-salud · bump |

## Decisiones

| Decisión | Fundamento |
|---|---|
| Un contenedor, mismo origen | Un club con un VPS no paga el costo de CORS + cookies cross-site + `_redirects` que exige separar el estático |
| `VITE_API_URL` vacío | Con el SPA horneado, las `VITE_*` quedan congeladas al construir. Vacío = relativo = la imagen sirve para cualquier dominio; con un host adentro, la imagen sería de ese host |
| Migraciones como servicio one-shot | Un entrypoint da crash-loop y pierde el error entre reintentos. Un `exec` a mano es lo que hizo que nadie descubriera que el comando documentado no funcionaba |
| Los `.sql` se copian en el build, no en el Dockerfile | Así `dist/` es autosuficiente y se prueba local. Un paso que sólo existe en la imagen sólo se puede verificar en CI |
| pgvector desde el Pool, no con `psql` | `node:22-alpine` no trae el binario; sumar `postgresql-client` es un paquete y un shell más en producción para un `CREATE EXTENSION` |
| El corpus por `docker compose cp` | Hornearlo es redistribuirlo en cuanto la imagen se publica (`Sources.md`). Es licencia, no tamaño |
| Tres capas contra el desajuste de embeddings | Una sola vuelve a fallar en silencio, que es el modo de falla que esta ola combate |
| Lista negra de secretos, no sólo longitud | El default del compose tenía 35 caracteres: ninguna regla de longitud lo podía atrapar |
| El arreglo del trigger en `0001_pgvector.sql` | Se intentó como migración `0008` y no servía: ese archivo se re-aplica en cada `migrate` y la pisaba milisegundos después. Revertida |
| v2.0.0 | No hay ruptura de API, pero sí de configuración, y es el hito de la primera versión desplegable |

## Las cinco iteraciones a ciegas de la Fase 1

El plan presupuestaba 8-15 pushes. Fueron 5, y salió barato porque cada vez que el problema se podía
reproducir sin Docker, se reprodujo.

| # | Qué se rompió | Cómo se encontró |
|---|---|---|
| 1 | `npm run build -w @dobleuno/shared` no existe | Relevamiento, antes del primer push |
| 2 | `npm prune --omit=dev` vaciaba `node_modules` entero: la raíz del monorepo no declara dependencias | CI |
| 3 | npm deja 15 paquetes anidados en `apps/server/node_modules` —`dotenv`, `openai`— y el runtime copiaba sólo la raíz | **Reproducido local**: el stage `proddeps` es sólo npm, así que bastó copiar los cuatro `package.json` a un temporal y correr `npm ci --omit=dev`. `express` aparecía, `dotenv` no |
| 4 | `CORS_ORIGIN` vacío no desactivaba CORS: impedía arrancar | CI |
| 5 | El journal de Drizzle vive en `drizzle`, no en `public` | CI — era mi consulta de verificación, no el producto |

Dos de los cinco fueron errores míos en los tests y las aserciones. Y uno lo pushé con el test en
rojo porque encadené el commit al `grep` en vez de al exit status.

## Los fallos en verde que se cerraron

Todos comparten la forma: el sistema responde 200, el proceso sale con 0, y lo que tenía que
funcionar no funciona.

| Cadena | Síntoma visible |
|---|---|
| `OPENAI_API_KEY` → 1536 dims contra `vector(384)` → trigger degrada a WARNING → 3700 filas con `embedding_vec` NULL → retrieval matchea cero | El oráculo contesta "no tengo información suficiente" a todo. Seed exit 0, tabla con 3700 filas, health 200 |
| Mock del LLM en producción | Prosa con citas inventadas y HTTP 200, indistinguible de una respuesta real — incluso para nuestras propias verificaciones |
| `VITE_API_URL` vacío → `.url()` lo rechaza → `safeParse` cae a un literal con `localhost:3000` | El bundle de producción apunta a localhost. **En CI pasaría el smoke igual**, porque todo corre en localhost; el error aparece recién en el servidor |
| Traductor: lo no traducido se escribe en inglés dentro de `data/translated/`, que el seed prefiere por existir | Se paga DeepSeek y el corpus queda en inglés, sin que nada lo diga |
| `/api/health` 200 con la base caída, y el `HEALTHCHECK` apuntaba ahí | Contenedor `healthy` para siempre sin base |

## Evidencia (R16)

```
218 tests (180 server + 33 web + 5 pipeline) + 11 live skip
lint 0 · typecheck 0 (incluye scripts/ desde esta ola) · build ok
CI: dos jobs verdes

Job docker:
  ✓ GET /                     200 text/html, con el mount point y un bundle JS
  ✓ GET /reglas               200 text/html   (el fallback del SPA anda)
  ✓ GET /api/rules/sections   200 application/json  (el fallback NO comió la API)
  ✓ GET /api/health/ready     200, database up, versión del package.json
  ✓ GET /api/no-existe        404 application/json
  extensión vector presente · 8 migraciones aplicadas

Verificado local contra el Postgres de WSL:
  migraciones + pgvector con `node dist/` desde la raíz
  insert de 1536 dims → falla con mensaje accionable
  insert de 384 dims → embedding_vec poblado
  seed completo: 3700 chunks, sin NULLs
  el corpus re-parseado sale byte a byte idéntico tras tocar el parser
```

Tests nuevos: 17 estáticos sobre Dockerfile y compose (uno afirma que los scripts npm invocados
existen — hubiera cazado el bloqueante entero), 13 sobre las exigencias de producción y los guards.

## Lo que no se pudo verificar

- **La imagen en un servidor real.** CI no es un VPS con reverse proxy, TLS y un volumen
  preexistente. Queda escrito en `deploy.md`, en el CHANGELOG y en el ADR.
- **El oráculo punta a punta.** El diagnóstico sí quedó cerrado, y no es nuestro: DeepSeek acepta la
  request con HTTP 200, manda los headers en medio segundo y no genera un token en 45 s. Igual con
  curl, igual en streaming. Reintentado varias veces durante la sesión.
- **La traducción del corpus.** Depende del mismo proveedor. El traductor quedó endurecido —cache
  incremental y atómico, timeout, staging con promoción sólo si valida— así que cuando DeepSeek
  vuelva es una corrida y nada más.

## Un apunte para la próxima

Escribiendo el guard del seed reintroduje el mismo bug que la Ola 11 había arreglado: `db.execute()`
devuelve un `QueryResult`, no un array. El helper que ya existía para eso estaba sin exportar
adentro de `rag.ts`. Ahora vive en `db/client.ts`, con el comentario explicando que pasó dos veces.
