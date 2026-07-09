# Dobleuno — Changelog

Todas las versiones notables.

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
