# Dobleuno — Changelog

Todas las versiones notables.

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
