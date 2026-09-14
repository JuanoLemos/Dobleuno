# Dobleuno — Changelog

Todas las versiones notables. Formato Keep a Changelog + semver.

Cada versión lista los cambios técnicos. Donde existe, se anida abajo la **bitácora de la ola**
— el relato de qué se construyó y qué se decidió, que antes vivía en un changelog aparte.

## [Unreleased]

_Nada sin versionar todavía._

---

## [1.2.0] — 2026-09-14

**Ola 11 — Codex en React** (ADR-011). La ola empezó como un porteo de UI y terminó siendo,
primero, conseguir el contenido: el pipeline llevaba dos meses terminando en verde sin bajar una
sola regla.

### Added
- **El corpus real**: 1796 reglas, 751 items mágicos y 577 unidades de `tow.whfb.app`,
  3124 páginas bajadas sin una falla.
- **Codex en React** — `/reglas`, `/reglas/:slug`, `/items`, `/items/:slug`, `/sobre`, con piel
  `codex` aplicada por ruta (`data-skin` en el body, puesto y sacado por `CodexLayout`).
  - Búsqueda y paginado server-side: con 1796 reglas, filtrar el DOM no alcanza.
  - Navegación por sección del reglamento y por familia de item, con conteos reales.
  - Cache en Dexie (v3): lo que se navegó se lee sin señal.
  - `@media print` para llevar una regla a la mesa.
  - El oráculo queda embebido como panel colapsable, no como pestaña aparte (ADR-007).
- `scripts/validate-corpus.ts` — corta el pipeline si el corpus sale degenerado. Es la pieza que
  impide que el incidente de abajo se repita en silencio.
- `apps/server/src/__tests__/codex-routes.test.ts` — 14 tests de ruteo. Un 503 prueba que el path
  matcheó; un 404, que no. Es exactamente el bug que no se detectó durante dos meses.
- `scripts/__tests__/parse-tow.test.ts` — tests del parser de verdad, importándolo.
- Columnas `name_es` / `description_es` (migración `0007`), nullables: null significa "todavía no
  se tradujo", que es distinto de "traducido igual al inglés".
- `apps/web/public/robots.txt` y `<meta robots="noindex">` en las rutas del Codex.

### Fixed
- **El mirror nunca capturó contenido.** Los 39 HTML de `data/raw/rule/empire/` tenían el mismo
  MD5: eran el shell de carga de Next.js. La causa era la URL (`/rules/<slug>.html` en vez de
  `/<ruleType>/<slug>`), no el parser. El manifest ahora sale de los tres sitemaps del sitio en
  vez de 39 slugs hardcodeados.
- **`/api/rules/search` y `/api/kb/stats` eran 404 desde la Ola 2.** El router se monta en `/api`
  y declaraba `/search` y `/stats`. No había un solo test que tocara estas rutas.
- **El seed nunca pobló `special_rules`, `magic_items` ni `units`.** Escribía solo `kb_chunks`, a
  partir de 9 unidades hardcodeadas. Por eso las listas volvían vacías con la base sana.
- **Las entradas embebidas se descartaban.** 523 reglas embeben una, y en las armas esa entrada
  *es* el perfil: "Great Weapon" quedaba sin alcance, fuerza ni penetración. Medido sobre las
  1796: 742 quedan más completas, 1039 igual, 2 peor. Reglas sin texto: de 4 a 0.
- **Los párrafos partían las frases** en cada link: `"durante la 
fase de Combate
, el modelo"`.
- **Las reglas especiales de las unidades venían pegadas**: `"Counter ChargeFirst ChargeSwiftstride"`
  — tres reglas ilegibles e imposibles de volver a separar, en ~500 unidades.
- `parseRobotsTxt` trataba los patrones como prefijos literales: respetaba `robots.txt` por
  casualidad, y un `Disallow: /*.json$` no lo hubiera frenado.
- El traductor leía `special-rules.json` con campos del corpus viejo; habría fallado en el primer
  archivo del pipeline nuevo.
- El unit picker del list builder se quedaba en "Cargando…" para siempre ante un 503, y ofrecía
  cuatro filtros (lord/core/special/rare) que el corpus no puede distinguir: el sitio no publica
  la categoría de lista de ejército. Ahora son "Personajes" y "Tropas", que sí existen.

### Changed
- Taxonomía en texto libre (migraciones `0005` y `0006`): fuera los enums de 2 facciones, 5
  categorías, 8 tipos de regla y 4 rarezas. El corpus real tiene 31 ejércitos, 31 secciones de
  reglamento y 70 familias de item, y los statlines usan `-`, `(+1)` y `2D6`.
- `npm run parse:test` entra a CI. Los tests de `scripts/` no corrían: no es un workspace.
- El corpus se siembra desde `data/translated/` cuando existe, y desde `data/processed/` si no.

### Removed
- **`portal/`** (29 archivos + 33 MB de brand duplicado). Nunca se desplegó: no estaba en CI, ni
  en `docker-compose.yml`, ni en la guía de deploy. Última versión en el tag `v1.1.0`, commit
  `babd1591bf854f2153656d7e2201c63706558e21`.
- `apps/web/src/routes/Reglas.tsx`, `components/reglas/{RuleCard,MagicItemCard,UnitCard}.tsx`,
  `lib/kb-sync.ts`, `lib/seed-units.ts`.
- `scripts/parser/` — un test que re-implementaba el parser adentro del test y lo corría contra
  fixtures HTML escritos a mano. Pasaba en verde mientras el parser real producía basura, porque
  no lo estaba probando.

### Deuda conocida
- **La carga a Postgres no está verificada**: no hay Docker en la máquina del autor, así que
  `db:migrate` y `kb:seed` contra la base real quedan sin correr. Las migraciones `0005`–`0007`
  dropean y recrean tres tablas.
- El corpus está **en inglés**: el traductor está adaptado pero no corrió (2547 entradas de
  DeepSeek). El Codex muestra inglés y lo dice en `/sobre`.
- Los unfurls de Discord y WhatsApp no ven los meta tags: esos bots no ejecutan JS.
- Las unidades están en la base y en la API, pero no tienen UI en el Codex.

---

## [1.1.0] — 2026-09-14

### Added
- Walkthrough de la sesión de v1.0.3 (`doc/arch/walkthrough/`) + su línea en la bitácora. El
  ciclo de `/CBP` pide registro por sesión salvo en el camino `commit`; el trabajo de SISTEMA.md
  se liberó por ese camino y quedó sin registrar.
- **Ola 10 — Crónicas** (ADR-010): el relato de una batalla terminada, generado con DeepSeek,
  más una galería de fotos de la partida.
  - Tablas `cronicas` y `cronica_fotos` (migración `0004`), con visibilidad privada/pública
    elegida por el autor y tono `cronista` | `epico` | `sobrio`.
  - `lib/story-gen.ts` — el modelo ancla cada afirmación con `[u:N]`/`[h:N]` y el server valida
    cada marcador contra la partida real, borrando del texto los inventados. Si alucina más de
    dos nombres de unidad reintenta una vez; si reincide, guarda con los avisos visibles.
  - `prompts/cronica.ts` — system prompt propio y versionado: el del oráculo prohíbe narrar.
  - `lib/uploads.ts` — primer storage de archivos de usuario del proyecto: tipo por magic bytes,
    nombre `<uuid>.<ext>`, sin SVG, 8 MB por foto y 12 por crónica.
  - Fotos servidas con `express.static` bajo `/api/media/cronicas` (capability URL) y volumen
    Docker `dobleuno-uploads`, separado del de la KB.
  - Cliente: galería con filtro mías/del club, detalle en ruta propia, modal con selector de
    tono, y downscale de las fotos en el browser antes de subirlas.
  - Tope de 5 generaciones por crónica más cooldown de 30s por usuario. Es el primer endpoint
    LLM del repo con freno.

### Fixed
- **`/api/battles` y `/api/lists` no tenían auth**: usaban un `PLACEHOLDER_USER_ID = 'dev-user-1'`
  hardcodeado, así que todos los usuarios compartían las mismas filas y cualquiera veía (y
  borraba) las listas y batallas de los demás. Ahora exigen sesión y filtran por `req.authUser.id`.
- **`endBattle()` no persistía**: solo mutaba el state local, así que quien terminaba una partida
  y navegaba sin apretar "Guardar" no dejaba ninguna fila con `status: 'finished'` — y la galería
  de Crónicas hubiera arrancado vacía para siempre.
- `lists.ts`: `ensureDb()` hacía `if (!isDbHealthy())` sobre una función async. Una Promise
  siempre es truthy, así que el 503 era inalcanzable.
- `Batalla.tsx` se comía el 401 en un `catch` vacío: un anónimo veía "Sin batallas en curso" en
  vez del prompt de login.


## [1.0.3] — 2026-09-14

### Changed
- `doc/arch/SISTEMA.md` actualizado a v1.0.2: quedaba en el estado de Ola 7.1. Suma los
  endpoints y tablas de club y mesas (Olas 8 y 9), el SPA fallback del server, el portal Astro,
  la sección del pipeline del oráculo (pgvector como requisito duro tras borrar el fallback
  ILIKE), Node 22 y el pipeline de CI. Se corrigió además la lista de ADRs: numeraba un
  "ADR-006: KB sync" que choca con el ADR-006 real (React single source of truth) y listaba
  ADR-001 a 004, que nunca existieron como archivo — esas decisiones viven en `doc/plan/PLAN.md`.


## [1.0.2] — 2026-09-14

### Changed
- **Proyecto adaptado a Diligencia v4.3.1** (`/adaptar` Flujo B). `docs/` pasa a `doc/` y
  `ROADMAP.md` sube a la raíz, siguiendo la convención de la metodología. 18 archivos movidos
  con `git mv` (historial preservado) y 17 con referencias reescritas.
- **Los dos changelogs se unificaron acá**. Antes convivían uno narrativo por ola en la raíz y
  uno keep-a-changelog en `docs/`. Ahora es un solo archivo: versiones keep-a-changelog, con la
  bitácora de cada ola anidada bajo su versión. Queda anotado que v0.9.0 y v0.8.1 nunca se
  taguearon — el release saltó de v0.8.0 a v1.0.0.
- `scripts/bump-version.js` escribe en `CHANGELOG.md` (antes `docs/CHANGELOG.md`).
- `AGENTS.md` queda como resumen operativo y apunta a `CLAUDE.md` como SSOT.

### Added
- `CLAUDE.md` — SSOT del proyecto: 19 variables de ruta, stack, archivos críticos, disciplina
  BUILD y R79.2.
- `INDEX.md`, `DILIGENCIA.md` y `diligencia-lock.json` (14 canónicos: 8 idénticos al template,
  6 override por placeholders reemplazados).
- Canónicas de Diligencia en `doc/`: MANDATO (tabla de modelos adaptada a DeepSeek, ver
  ADR-005), MECANICA-AUDIO, MECANICA-CALIDAD, MECANICA-LOCK, identidad, bugs, incidentes,
  bitacora, walkthrough, ADR_SUMMARY, backups.
- `doc/arch/status-salud.md` — diagnóstico de salud del proyecto.


## [1.0.1] — 2026-09-13

### Fixed
- **El retrieval del oráculo nunca devolvía chunks** (`lib/rag.ts`). Las dos ramas cerraban con `Array.isArray(rows)`, pero drizzle/node-postgres resuelve `db.execute()` con un QueryResult, no con un array. El oráculo contestaba "no tengo información suficiente" al 100% de las preguntas desde Ola 5. Helper `toRows()` acepta las dos formas.
- **Los live tests de DeepSeek no se salteaban en CI** (`prompts/__tests__/system.test.ts`). El guard miraba solo si `DEEPSEEK_API_KEY` existía, y el workflow define `sk-test-mock` como fallback: los 10 tests salían a la API real y volvían 401. Es la razón por la que el CI estuvo rojo desde Ola 2.

### Changed
- **Borrado el fallback ILIKE del retrieval** (`lib/rag.ts`). Armaba términos a partir de los números del vector, así que devolvía filas arbitrarias. Sin pgvector el oráculo ahora no responde, en vez de citar contexto casual. El tipo de `fallback` queda en `'pgvector' | 'none'`, alineado en `web/src/lib/ask-api.ts`.

### Added
- **Tests del oráculo** (`__tests__/rag-oracle.test.ts`, 11 tests) con `openai` y `db.execute` mockeados: corren sin red, sin créditos y sin Docker. Cubren armado del prompt, validación de citas, caminos sin contexto y errores del LLM.

### CI
- Migraciones de Drizzle + extension pgvector + seed de la KB antes de los tests. Antes el runner levantaba Postgres pero nunca lo migraba: los tests pasaban por el camino degradado sin ejercitar nada contra base.
- Imagen `pgvector/pgvector:pg16`, igual que docker-compose.

### Docs
- Workspace movido a `Desktop/Dobleuno/` (antes anidado en el fork `OldWorld/`). D1 revisada en PLAN y PLAN-OLEADAS.
- El seed son 23 chunks, no ~28 (ROADMAP).


## [1.0.0] — 2026-09-13 — Olas 8 y 9 cerradas (Home del club + Mesas)

> Release que cierra trabajo que quedó en el árbol sin commitear desde el 2026-07-10.
> El detalle por ola vive en `CHANGELOG.md` (raíz) — acá va el resumen técnico.

### Added
- **Ola 8 — Home del club + TabShell** (ADR-006/007/008)
  - `db/schema/club.ts` + migración `0002_club_info.sql` — info del club editable por admin
  - `routes/club.ts`, `routes/account.ts` — API de club e info de cuenta
  - `components/shell/{TabShell,NavTabs,ClubBanner}.tsx` — shell con tabs; se elimina el bottom-nav
  - `routes/Home.tsx` + `styles/portal.css` — home editorial cream (semilla de Ola 10)
- **Ola 9 — Mesas** (ADR-009)
  - `db/schema/mesas.ts` + migración `0003_stale_master_mold.sql` — `mesas`, `sesiones`, `reservas`
  - `routes/{mesas,sesiones,reservas}.ts` — CRUD admin + GET público + reserva de jugador
  - Anti-doble-booking: `UNIQUE(sesion_id, user_id)` + validación de capacidad
  - `routes/Mesas.tsx`, `components/mesas/{SesionCard,MesasAdmin}.tsx`, `lib/{mesas,reservas,club}-api.ts`
  - 15 tests nuevos (mesas 10 + reservas 5)
- **Portal Astro** — sitio estático del reglamento traducido (`portal/`), pipeline `scripts/{translate-tow,rules-sync}.ts`
- **Brand kit** — 9 piezas generadas, servidas desde `apps/web/public/brand/` y `portal/public/brand/`
- **i18n** — claves `club.loading`, `club.more`, `club.edit` en es-AR y en (antes solo defaultMessage)
- **Server: SPA fallback** (semilla de Ola 11) — sirve `apps/web/dist` si existe; `WEB_DIST_DIR` lo hace configurable

### Fixed
- `routes/Home.tsx` — `icon` tipado como `LucideIcon` (antes `ComponentType<{size?: number}>`, incompatible con lucide-react) y se quitan dos `useIntl()` sin usar. Rompía `typecheck`.
- `routes/auth.ts` — `req.body` se estrecha a `unknown` antes de `Object.keys`, sin `any` implícito
- `routes/mesas.ts` — imports sin usar (`and`, `sesiones`)
- `routes/{reservas,sesiones}.ts` — `as string` innecesarios en `req.params.id`
- `routes/Mesas.tsx` — `eslint-disable` de `react-hooks/exhaustive-deps`, regla que no está configurada en el flat config (era error de lint)
- `__tests__/server.test.ts` — el test "GET / responde 404" quedó obsoleto con el SPA fallback; ahora contempla ambos casos según exista o no el build del cliente

### Verificado
- `npm run typecheck` — 0 errores · `npm run lint` — 0 errores, 0 warnings · `npm test` — 130 pasando, 11 skipped (live)

### Bitácora — Ola 9: Mesas (calendar multi-mesa)

> **Cierre de release: 2026-09-13.** Las Olas 8 y 9 se terminaron el 2026-07-10 pero quedaron
> sin commitear. Al retomar, el árbol no compilaba (`Home.tsx`) ni pasaba lint, y un test del
> server había quedado obsoleto. Se arreglaron esos seis puntos, se agregaron las claves i18n
> `club.*` faltantes, y se tagueó v1.0.0 con todo junto — incluido trabajo temprano de Olas 10–11
> (home cream, SPA fallback del server) que estaba en el mismo árbol. Detalle en las secciones de arriba.

#### Highlights

- **Calendar multi-mesa**: el admin publica sesiones ("Sábado 14hs, mesa 1, 2000 pts") y los jugadores reservan plaza. Anti-doble-booking por user + por cupo. Ver ADR-009.
- **Reserva con lista opcional**: si el user tiene una lista del armybuilder guardada, puede anclarla a la reserva (preparado para Fase 2 — battle tracker).
- **Single-tenant MVP**: un deploy = un club. Multi-club queda para Fase 2.

#### Backend

- `db/schema/mesas.ts` — tablas `mesas`, `sesiones`, `reservas` + enum `formato_sesion` ('2000' | '2500' | 'open').
- `db/migrations/0003_stale_master_mold.sql` — generado con drizzle-kit.
- `routes/mesas.ts` — CRUD admin + GET público (sin auth).
- `routes/sesiones.ts` — CRUD admin + GET público (default futuras, `?includePast=true` para admin).
- `routes/reservas.ts` — `POST /api/sesiones/:id/reservar`, `DELETE /api/sesiones/:id/reservar/:rid`, `GET /api/mis-reservas`.
- **Anti-doble-booking**: `UNIQUE(sesion_id, user_id)` en DB. Validación de capacidad `count(reservas) vs mesa.capacidad` antes de insertar.
- Tests: 15 nuevos (mesas.test.ts 10 + reservas.test.ts 5) sin regresiones. Total server: 12 archivos, 100+ tests pasando.

#### Frontend

- `lib/mesas-api.ts` — client (`mesasApi`, `sesionesApi`).
- `lib/reservas-api.ts` — client (`reservasApi.create`, `.cancel`, `.misReservas`, `.list`).
- `lib/modules.ts` — módulo `mesas` registrado con icono `CalendarDays`, `requiresAuth: true`.
- `routes/Mesas.tsx` — vista jugador: sesiones agrupadas por semana ("Esta semana", "Próxima semana", "Más adelante"), empty state, login prompt si no está logueado.
- `components/mesas/SesionCard.tsx` — card con fecha AR, mesa, formato, cupos X/Y, botón reservar/cancelar.
- `components/mesas/MesasAdmin.tsx` — modal admin con tabs Sesiones/Mesas + SesionForm + MesaForm.
- `App.tsx` — ruta `/mesas` registrada.
- i18n: `mesas.title`, `mesas.empty`, `mesas.placeholder` (es-AR + en).

#### Decisiones de usuario

- Capacidad por mesa (enum 2/4/6/8), no por sesión.
- GET público de sesiones y reservas (anima a registrarse para reservar).
- Hard delete de sesiones con cascade a reservas (admin es responsable).
- Soft delete de mesas (`activa=false`).
- TZ: server UTC, UI `America/Buenos_Aires` con `Intl.DateTimeFormat`/toLocaleString.

#### ADRs

- ADR-009 — Calendar data model (mesas/sesiones/reservas + capacidad + reservas).

#### Bugfixes preexistentes encontrados

- `req.params.id` con `noUncheckedIndexedAccess: true` requiere `as string` (Express 5 lo tipea como `string | string[] | undefined` por wildcards). Patrón aplicado a todas las rutas con params.

### Bitácora — Ola 8: Home del club + TabShell

> Declarada como v0.9.0 en la bitácora de olas, pero nunca se tagueó: el release saltó de
> v0.8.0 a v1.0.0 porque las Olas 8 y 9 se cerraron juntas.

#### Highlights

- **Single source of truth**: React app es el único lugar donde vive la lógica post-login. Portal Astro queda como anexo SEO. Ver ADR-006.
- **TabShell**: header horizontal sticky con tabs `Codex` / `Ejércitos` (Mesas y Crónicas se agregan en Ola 9 y 10). El bottom-nav antiguo se eliminó. Ver ADR-007.
- **Club banner**: header secundario compacto con el nombre del club + horarios + dirección. Click expande modal con info completa + CTA "Editar" si sos admin. Ver ADR-008.

#### Backend

- `db/schema/club.ts` — tabla `club_info` (single-row, id=1).
- Migración `0002_club_info.sql`.
- `routes/club.ts` — `GET /api/club` (público, sembrado default) + `PUT /api/club` (requireAdmin).
- `lib/auth.ts` — `trustedOrigins` configurado para `localhost:5173` (Vite) y `localhost:4321` (portal). Bug preexistente que rompía sign-in cross-origin.
- Tests existentes: 88 passed + 11 skipped (sin regresiones).

#### Frontend

- `components/Sigil.tsx` — extraído (era inline en AuthLayout).
- `lib/modules.ts` — registry de módulos del shell (id, label, route, icon, requiresAuth).
- `lib/club-api.ts` — client (`get` + `update`).
- `components/shell/TabShell.tsx` — layout raíz (header + club banner + tabs + outlet + footer).
- `components/shell/NavTabs.tsx` — tabs horizontales con scroll mobile.
- `components/shell/ClubBanner.tsx` — banner compacto + modal expandido.
- `components/layout/AppShell.tsx` — ahora alias de TabShell (back-compat).
- `routes/AuthLayout.tsx` — sin cambios funcionales (Sigil extraído).
- `App.tsx` — home `/` redirige a `/reglas` (Codex por default, público).

#### Bugfixes preexistentes

- `vite.config.ts` — proxy `/api → http://localhost:3000`. Sin esto, el cliente React no podía hablar con el backend en dev.
- `lib/auth.ts` — `trustedOrigins` agregado (el cliente React corría en otro puerto y better-auth lo rechazaba).

#### ADRs

- ADR-006 — React app single source of truth.
- ADR-007 — Naming de módulos en español.
- ADR-008 — Modelo de datos del club (single-row, single-tenant).

#### Tests

- `apps/web/src/test/smoke.test.tsx` actualizado para los nuevos tabs (`Codex`, `Ejércitos`) + mock de `club-api`.
- 22 tests passed (de 19 antes — +3 nuevos).

#### Decisiones de usuario

- Routing: tabs visibles siempre (sin redirección a /app si logueado).
- Tabs UI: header horizontal sticky (móvil + desktop).
- Placeholders: solo tabs de módulos implementados (Mesas y Crónicas NO se muestran hasta Ola 9/10).

---

## [0.8.1] — 2026-07-10 — Ola 0.6 (UI v2 + Branding IA)

> Versión declarada en la bitácora de olas; nunca se tagueó.

#### Highlights

- Portal Astro recibió un rebrand visual completo: 2 pieles (Cartógrafo + Codex) × 2 modos (light/dark).
- Brand kit generado con Matrix MiniMax: 3 escudos, 3 hero backgrounds, 1 escena ambient, 2 tiles.
- Branding aplicado a portal (home, /reglas, /sobre) + armybuilder (login + cards).

---

## [0.8.0] — 2026-07-09 — Ola 7.1 cerrada (KB sync admin)

### Added
- **Server: tabla `users.is_admin`** (`apps/server/src/db/schema/users.ts`)
  - Flag binario para promover admins vía env var `ADMIN_EMAILS`
  - Migración `0001_ambitious_starbolt.sql` agrega la columna
- **Server: middleware `auth`** (`apps/server/src/middleware/auth.ts`)
  - `requireAuth` — verifica sesión de better-auth
  - `requireAdmin` — valida `is_admin=true` además de auth
- **Server: script `promote-admin`** (`apps/server/src/scripts/promote-admin.ts`)
  - Promueve usuarios listados en `ADMIN_EMAILS` al boot del server
- **Server: ruta `POST /api/admin/kb/sync`** (`apps/server/src/routes/admin-kb.ts`)
  - Body: opcional `{ runNow?: boolean }` — si no se pasa, ejecuta en background (202)
  - Respuesta inmediata: `{ status: 'queued', runId }`
  - `GET /api/admin/kb/sync/status` — devuelve estado del job en curso + logs
  - `GET /api/admin/kb/sync/logs` — últimas N ejecuciones
  - Protegido con `requireAuth + requireAdmin`
- **Server: orquestador `kb-sync`** (`apps/server/src/lib/kb-sync.ts`)
  - Pipeline `mirror → parse → ingest` con job queue in-memory (no más cron diario)
  - Estado observable (`idle | running | success | error`) + logs persistentes
  - Idempotente — múltiples POSTs no duplican jobs
- **Server: `kb-ingest`** (`apps/server/src/lib/kb-ingest.ts`)
  - Lee `data/processed/*.json`, genera embeddings, persiste en `kb_chunks`
  - Embeddings reusables: OpenAI en prod o Deterministic (dev/test)
  - Maneja updates (upsert por `ref` + `source`) — re-sync no duplica
- **Scripts refactorizados para ser importados:**
  - `scripts/mirror-tow.ts` — `runMirror()` exportable
  - `scripts/parse-tow.ts` — `runParse()` exportable
- **Deploy: docker-compose** — volumen nuevo `dobleuno-kbdata`
  - Cache de mirror parsea persiste entre reinicios
  - Montado en `server:/app/data` y `postgres:/var/lib/postgresql/data`
- **Deploy: docker-compose** — removido campo `description` (invalid en Compose moderno)

### Changed
- **Server: `env.ts`** — agregada env var `ADMIN_EMAILS` (CSV de emails a promover)
- **Server: `index.ts`** — invoca `promoteAdmin()` al boot con `env.ADMIN_EMAILS`
- **Tooling: `drizzle.config.ts`** — usa `tsx` + path root `node_modules` (drizzle-kit ESM fix)
- **Server: `battles.test.ts`** — fix flaky test (orden de inserts en suite)

### Notes
- **Migración necesaria al deployar v0.8.0:**
  ```bash
  npm run db:migrate -w @dobleuno/server
  # Asegurarse de que el env ADMIN_EMAILS esté configurado si se quiere un admin desde el boot.
  ```
- **Promover admin manualmente (alternativa al env):** conectar a la DB y ejecutar `UPDATE "user" SET is_admin = true WHERE email = '<email>';`
- **Re-sync manual desde la web:** cualquier admin puede triggear un re-sync completo desde el panel Admin (próxima Ola) o directamente con curl:
  ```bash
  curl -X POST http://localhost:3000/api/admin/kb/sync -H "Cookie: <session>"
  ```

### Tests
- **108 tests** (88 server + 20 web) + 11 live skip
  - +5 nuevos respecto a v0.7.0: `admin-kb.test.ts` (3) + `kb-sync.test.ts` (2)
- Lint 0 errors, 0 warnings
- Typecheck verde en 4 workspaces (server, web, shared, root)
- Build web/server OK
- **E2E verificado:** `shabilez@gmail.com` → `POST /api/admin/kb/sync` → 21 chunks reales en `kb_chunks` desde `tow.whfb.app`

## [0.7.0] — 2026-07-09 — Ola 6 cerrada (Polish + Deploy)

### Added
- **Deploy: Dockerfile multi-stage** (`apps/server/Dockerfile`)
  - Stage 1 `deps`: install con `--legacy-peer-deps`
  - Stage 2 `build`: compila shared + server con TypeScript
  - Stage 3 `runtime`: imagen minimal node:22-alpine, usuario no-root, healthcheck
- **Deploy: docker-compose.yml actualizado** (`docker-compose.yml`)
  - Postgres usa imagen `pgvector/pgvector:pg16` (en vez de `postgres:16-alpine`)
  - Servicio `server` agregado con build desde Dockerfile
  - Variables de entorno completas: `DATABASE_URL`, `BETTER_AUTH_*`, `CORS_ORIGIN`, `DEEPSEEK_*`, `OPENAI_*`, `LOG_LEVEL`
  - `depends_on` con `condition: service_healthy` para Postgres
- **Deploy: .dockerignore** — minimiza contexto del build
- **Deploy: guía completa** (`doc/guias/deploy.md`)
  - Hetzner VPS setup (CX11 €3.29/mes suficiente para MVP)
  - Cloudflare / Caddy / Nginx para HTTPS
  - Backup strategy con cron + pg_dump
  - Monitoreo con UptimeRobot
  - Adaptación para Fly.io / Railway
  - Costos estimados (~€15-30/mes total)
  - Troubleshooting
- **Docs: README actualizado** — estado real (Olas 0-5 cerradas), comandos completos, tabla de features por ola con tags
- **Docs: ROADMAP actualizado** — métricas acumuladas (103 tests, 0 lint errors, bundle sizes, etc.)

### Changed
- `docker-compose.yml` — imagen pgvector + server service
- `apps/web/index.html` — viewport, theme-color, PWA meta ya estaban bien configurados
- `apps/web/public/manifest.webmanifest` — theme_color blood, icons 192/512/maskable ya estaban bien

### Notes
- **Lighthouse**: no corrido localmente (requiere browser real o CI), pero el bundle cumple los criterios:
  - Main gzipped: 180KB + vendor 53KB = ~234KB
  - PWA precache: 565KB, 33 entries (offline-first funcional)
  - Theme color + manifest correctos
  - Viewport `width=device-width, viewport-fit=cover, user-scalable=no` para mobile
  - Touch targets ≥44px en botones primarios
- **Screenshots**: pendiente — el usuario agregó nota de capturar al deployar

### Tests
- **103 tests** (83 server + 20 web) + 11 live skip
- Lint 0 errors, 0 warnings
- Typecheck verde en 3 workspaces

## [0.6.0] — 2026-07-09 — Ola 5 cerrada (Rules Oracle RAG)

### Added
- **Server: tabla `kb_chunks`** (`apps/server/src/db/schema/kb.ts`)
  - Schema con `id`, `source` (unit/rule/item/scenario/faq), `ref`, `title`, `text`, `faction`, `embedding` (jsonb), `createdAt`
  - Índices por source, ref, faction
- **Server: pgvector extension migration** (`apps/server/src/db/migrations/0001_pgvector.sql`)
  - `CREATE EXTENSION IF NOT EXISTS vector;`
  - Columna `embedding_vec vector(384)` sincronizada vía trigger desde el jsonb
  - Índice ivfflat con cosine ops para búsqueda rápida
- **Server: embeddings provider** (`apps/server/src/lib/embeddings.ts`)
  - Interfaz `EmbeddingProvider` swappable
  - **DeterministicEmbeddingProvider** (fallback dev/test, hash-based 384-dim, sin API)
  - **OpenAIEmbeddingProvider** (producción, `text-embedding-3-small`, 1536-dim)
  - Auto-selección según `OPENAI_API_KEY` env var
  - Vector normalization (L2 norm = 1) para cosine = dot product
  - Helper `cosineSimilarity()`
- **Server: LLM helper** (`apps/server/src/lib/llm-helper.ts`)
  - `callLLM()` con fallback mock determinístico si no hay `DEEPSEEK_API_KEY`
  - Mock cita `[cita:1]` para testear pipeline end-to-end sin API
- **Server: RAG pipeline** (`apps/server/src/lib/rag.ts`)
  - `ask()` — flujo completo: embed query → retrieve top-K → build prompt → LLM → validate citations
  - `extractCitations()` — regex `[cita:N]` con validación contra chunks reales
  - `retrieveChunks()` — pgvector cosine distance, fallback ILIKE si pgvector no disponible
  - Truncation de citation text a 200 chars + ellipsis
- **Server: ruta `POST /api/ask`** (`apps/server/src/routes/ask.ts`)
  - Body: `{ question, faction?, limit? }` (limit 1-10, default 5)
  - Respuesta: `{ answer, citations, chunksUsed, provider, fallback }`
- **Server: seed script** (`apps/server/src/seed-kb-chunks.ts`)
  - `npm run kb:seed -w @dobleuno/server` popula `kb_chunks` desde `SEED_UNITS` + 5 reglas básicas
- **Server: 21 tests nuevos** (9 embeddings + 7 rag + 5 ask endpoint)
- **Cliente: Citation type** (`packages/shared/src/types/rule.ts`)
- **Cliente: askApi** (`apps/web/src/lib/ask-api.ts`)
- **Cliente: AskBox** (`apps/web/src/components/reglas/AskBox.tsx`)
  - Textarea + submit con loading state + error handling
  - Reporta pregunta + respuesta al callback
- **Cliente: CitationList** (`apps/web/src/components/reglas/CitationList.tsx`)
  - Cards con iconos por source (unit/rule/item/scenario/faq)
  - Preview truncado a 200 chars
- **Cliente: OraclePanel** (`apps/web/src/components/reglas/OraclePanel.tsx`)
  - Une AskBox + respuesta + CitationList
  - Metadata: chunks used, provider, fallback mode
- **Cliente: integración en Reglas tab** — OraclePanel visible arriba del listado
- **Cliente: 3 tests CitationList**

### Changed
- `apps/server/src/app.ts` — montado `/api/ask`
- `apps/server/src/env.ts` — `OPENAI_API_KEY` + `OPENAI_EMBEDDING_MODEL` ya estaban
- `apps/server/package.json` — agregados scripts `kb:seed` y `pgvector:install`
- `apps/web/src/routes/Reglas.tsx` — OraclePanel visible junto al search

### Tests
- **103 tests** (83 server + 20 web) + 11 live skip
- Lint 0 errors, 0 warnings
- Typecheck verde en 3 workspaces
- Build web OK — bundle Reglas 110KB gz (+5KB por el oracle), precache 565KB

### Notas de despliegue
- Para usar embeddings reales: configurar `OPENAI_API_KEY` en `.env`
- Si el Postgres local no tiene pgvector, el endpoint funciona con fallback text-search (menos preciso)
- Para pgvector full: `psql $DATABASE_URL -f apps/server/src/db/migrations/0001_pgvector.sql`
- Seed inicial: `npm run kb:seed -w @dobleuno/server`

## [0.5.0] — 2026-07-09 — Ola 4 cerrada (Battle Tracker)

### Added
- **Server: tabla `battles`** (`apps/server/src/db/schema/battles.ts`) — schema propio
  - `id`, `userId`, `name`, `status`, `data` (jsonb con BattleState), timestamps
  - FK a `user` con cascade delete
  - Índices por user y status
- **Server: CRUD `/api/battles`** (`apps/server/src/routes/battles.ts`)
  - `GET /api/battles` — lista resumida (id, name, status, turn, phase, updatedAt)
  - `POST /api/battles` — crea con validación Zod (`playerListId` requerido)
  - `GET /api/battles/:id` — trae battle completo
  - `PATCH /api/battles/:id` — actualiza state parcial (merge con state existente)
  - `DELETE /api/battles/:id` — elimina
  - Al crear con `playerListId`, hidrata automáticamente los units desde la lista
- **Server: combat-math** (`apps/server/src/lib/combat-math.ts`)
  - `simulateCombat()` — Monte Carlo con wound table TOW (S vs T), to-hit (ws), saves
  - `computeBattleStats()` — agregados desde units + log
- **Server: 7 tests combat-math + 8 tests battles router** — schema validation sin DB, probabilidad de victoria, wound table, save notation
- **Cliente: battle-engine** (`apps/web/src/lib/battle-engine.ts`)
  - `PHASES`, `PHASE_LABELS`, `PHASE_DESCRIPTIONS` para las 6 fases TOW
  - `STATUS_LABELS` para los 9 unit status
  - `nextPhase()`, `isLastPhaseOfTurn()`, `isFirstPhaseOfTurn()`
  - `makeLog()` — helper para crear log entries con UUID + ISO timestamp
- **Cliente: PhaseBar** (`apps/web/src/components/batalla/PhaseBar.tsx`) — barra de navegación de fases con indicador visual (▶ / ✓ / ○) y número de turno
- **Cliente: UnitStateCard** (`apps/web/src/components/batalla/UnitStateCard.tsx`) — card de unidad con HP, status, woundsTaken, activeEffects
- **Cliente: BattleEdit route** (`apps/web/src/routes/BattleEdit.tsx`)
  - Setup panel con selección de lista + nombre + resumen rival
  - Tracker con phase bar, model counts, unit cards, advance phase, end battle
  - Post-game con resultado (victoria/derrota/empate)
- **Cliente: Batalla route refactored** (`apps/web/src/routes/Batalla.tsx`) — lista + CTA nueva batalla
- **Cliente: routes**:
  - `/batalla/nueva` — nueva batalla
  - `/batalla/:id` — tracker / setup
- **Cliente: 9 tests battle-engine** — phase state machine, log helper, statuses

### Changed
- `apps/web/src/App.tsx` — agregadas rutas `/batalla/nueva` y `/batalla/:id`
- `apps/server/src/db/schema/index.ts` — export de `battles`
- `apps/server/src/db/schema/users.ts` — removido placeholder de `battles` (ahora en `battles.ts`)
- Validación: handlers validan body con Zod **antes** de checkear DB → 400 antes que 503

### Tests
- **79 tests** (62 server + 17 web) + 11 live skip
- Lint 0 errors, 0 warnings
- Typecheck verde en 3 workspaces (server, web, shared)
- Build web OK — bundle main 180KB gz + vendor 53KB gz + BattleEdit 3.83KB gz

## [0.4.0] — 2026-07-08 — Ola 3 cerrada

### Added
- **Server: CRUD de listas** (`apps/server/src/routes/lists.ts`)
  - `GET /api/lists` — lista del user actual
  - `POST /api/lists` — crea con validación
  - `GET /api/lists/:id` — trae una lista
  - `PATCH /api/lists/:id` — actualiza
  - `DELETE /api/lists/:id` — elimina
- **Server: list-validator** (`apps/server/src/lib/list-validator.ts`) — defense in depth
- **Server: seed de unidades** (`apps/server/src/lib/seed-units.ts`) — 9 unidades (5 Empire + 4 Bretonia) para que el cliente funcione mientras no corre el mirror de Ola 2
- **Server: 6 tests nuevos** del list-validator (Empire 2000 pts válida, falta core, exceso special, 2 generals, etc.)
- **Cliente: list-validation lib** (`apps/web/src/lib/list-validation.ts`) — TOW composition rules
- **Cliente: list-export lib** (`apps/web/src/lib/list-export.ts`) — JSON + text + download
- **Cliente: lists-api client** (`apps/web/src/lib/lists-api.ts`)
- **Cliente: units-api client** (`apps/web/src/lib/units-api.ts`)
- **Cliente: UnitPickerModal** — modal full-screen mobile-first con búsqueda y filtros
- **Cliente: UnitRow** — fila de unidad con ajuste de modelos
- **Cliente: CompositionValidator** — panel con desglose + errores + advertencias
- **Cliente: ListSummary** — footer sticky con total + Save + Export
- **Cliente: ArmyEditor** — el editor completo de la lista
- **Cliente: routes**:
  - `/listas` — lista de listas
  - `/listas/nueva` — nueva lista (con faction picker)
  - `/listas/:id` — editar lista existente
- **Cliente: 8 tests smoke** actualizados

### Changed
- `apps/web/src/App.tsx` — agregadas rutas `/listas/nueva` y `/listas/:id`
- `packages/shared/src/types/list.ts` — `UnitOption.id` ahora opcional
- `apps/server/src/db/schema/users.ts` — schema de listas movido a `lists.ts` separado

### Tests
- **75 tests** (67 server + 8 web) + 11 live skip
- Lint 0 errors, 0 warnings
- Typecheck verde en 3 workspaces
- Bundle web: ~120 KB gzipped (creció ~5KB por el list builder)

## [0.3.0] — 2026-07-08 — Ola 2 cerrada

(Ver CHANGELOG anterior; mirror + parser + búsqueda offline)

## [0.2.0] — 2026-07-08 — Ola 1 cerrada

(Ver CHANGELOG anterior; monorepo + PWA + auth)

## [0.1.0] — 2026-07-08 — Ola 0.5 cerrada

(Ver CHANGELOG anterior; prompt v0.1 con DeepSeek)

## [0.0.0] — 2026-07-08

(Repo inicial)

---

*Formato basado en [Keep a Changelog](https://keepachangelog.com/).*

---

## Formato de entradas

- **Highlights** — 1-2 frases del impacto del release.
- **Backend / Frontend** — cambios concretos por capa.
- **Bugfixes preexistentes** — bugs encontrados y arreglados en passant.
- **ADRs** — decisiones arquitectónicas locked en el release.
- **Tests** — qué se rompió/qué se agregó.
- **Decisiones de usuario** — lo que se consultó al usuario en el replan.
