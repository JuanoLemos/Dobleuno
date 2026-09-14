# Dobleuno — Changelog

Todas las versiones notables.

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
- **Deploy: guía completa** (`docs/guias/deploy.md`)
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
