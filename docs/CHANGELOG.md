# Dobleuno — Changelog

Todas las versiones notables.

## [0.3.0] — 2026-07-08 — Ola 2 cerrada

### Added
- **Mirror de tow.whfb.app** (`scripts/mirror-tow.ts`)
  - Respeta `robots.txt`, rate limit 2s por defecto
  - User-Agent identificable: `Dobleuno/0.1 (+contact)`
  - Soporta army/rule/item types + faction filter
  - Dry-run mode + force re-download
  - Targets preconfigurados: 30 unidades Empire, 21 unidades Bretonia, 32 reglas especiales, 18 magic items
- **Parser HTML→JSON** (`scripts/parse-tow.ts`)
  - Usa cheerio + Zod para validación estricta
  - Schema versionado (v1) para Unit, SpecialRule, MagicItem
  - 3 niveles de extracción: name + stats + weapons + special rules + options
  - Falla loud con error claro cuando una página no matchea el schema
- **Tests del parser** con 5 fixtures HTML sintéticos (greatswords, handgunners, knights-of-the-realm, great-weapon, talisman-of-preservation)
- **Drizzle schema para KB** (`apps/server/src/db/schema/kb.ts`)
  - 4 enums: faction, unit_category, rarity, rule_category
  - 5 tablas: units, special_rules, magic_items, scenarios, ingest_log
  - Índices en faction, category, name, rarity
- **Endpoints de KB** en `/api`:
  - `GET /api/rules/search?q=&faction=&category=` — busca en unidades + reglas + items
  - `GET /api/units?faction=&category=` — lista unidades
  - `GET /api/units/:id` — unidad específica
  - `GET /api/rules` — lista reglas especiales
  - `GET /api/items?rarity=` — lista magic items
  - `GET /api/kb/stats` — stats de la KB
- **Cache local Dexie** (`apps/web/src/lib/dexie-kb.ts`)
  - Schema v2: units, rules, items, faqs, syncMeta
  - TTL 24h, refresh on online
- **KB sync** (`apps/web/src/lib/kb-sync.ts`)
  - Online → server, cachea en Dexie
  - Offline → cache local con filtro por TTL
  - Fallback graceful en errores de red
- **UI Reglas tab** con búsqueda real:
  - Input con icono
  - Filtros por facción (Todas / Imperio / Bretonia)
  - 3 secciones: Unidades / Reglas / Items
  - Cards para cada tipo (UnitCard con stats, RuleCard, MagicItemCard con rarity colors)
  - Indicador de "cache" cuando los datos vienen de Dexie
  - Banner offline cuando no hay red
- **Input component** ahora soporta `startIcon`
- **Documentación**:
  - `data/README.md` — explica la pipeline mirror→parse→ingest
  - `scripts/parser/__tests__/fixtures/*.html` — fixtures sintéticos para tests
  - `data/raw/.gitignore`, `data/processed/.gitignore`

### Changed
- `Reglas` route: de placeholder a implementación real con búsqueda y cache offline
- `Input` component: agregada prop `startIcon` con positioning relativo

### Fixed
- `CachedUnit` interface ya no extiende directamente `KBUnit` (conflicto en `source` field), usa campo separado `cachedFrom`
- `searchKB` retorna `fromCache: boolean` para que la UI muestre el indicador

### Tests
- **60 tests** (37 prompt static + 3 server + 8 web + 12 parser)
- **11 live** en skip (requieren `DEEPSEEK_API_KEY`)
- Lint 0 errors, 0 warnings
- Typecheck verde en los 3 workspaces
- Bundle web: ~115KB gzipped (creció ~2KB por las nuevas features)

## [0.2.0] — 2026-07-08 — Ola 1 cerrada

(Ver CHANGELOG anterior; monorepo + PWA + auth)

## [0.1.0] — 2026-07-08 — Ola 0.5 cerrada

(Ver CHANGELOG anterior; prompt v0.1 con DeepSeek)

## [0.0.0] — 2026-07-08

(Repo inicial)

---

*Formato basado en [Keep a Changelog](https://keepachangelog.com/).*
