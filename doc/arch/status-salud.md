# Estado de salud — Dobleuno

Generado por `/CBP full` (fase `/salud`). Última corrida: 2026-09-14.

---

## Resumen

| Área | Estado | Detalle |
|---|---|---|
| Estructura | ✅ | `doc/` completo (arch, guias, mecanicas, plan, qa, legal) + ROADMAP y CHANGELOG en raíz |
| Variables | ✅ | 19 variables de `CLAUDE.md`, todas resuelven a archivos reales |
| Links | ✅ | 8 links markdown relativos, 0 rotos |
| Versión Diligencia | ✅ | Proyecto v4.3.1 == global v4.3.1 |
| Shell global | ✅ | shell-lock 45/45 sin cambios; `PENDING.md` vacío |
| Tests | ✅ | 115 server + 26 web, 11 live skip |
| Lint | ✅ | 0 errores, 0 warnings (`--max-warnings=0`) |
| Typecheck | ✅ | 0 errores en los 3 workspaces |
| CI | ✅ | lint → typecheck → migraciones → pgvector → seed → tests → builds |
| Temporales | ✅ | Sin `.tmp`/`.log` versionados (`data/` y `dist/` ignorados) |

## Gaps documentales

| Gap | Severidad | Nota |
|---|---|---|
| ADRs 001–004 no existen | P3 | La numeración arranca en ADR-005; las decisiones previas viven en `doc/plan/PLAN.md` (D1–D14) |
| `bugs.md` e `incidentes.md` vacíos | P3 | Recién inicializados desde el template |

## Deuda técnica conocida

| Item | Severidad | Nota |
|---|---|---|
| El oráculo no se prueba punta a punta contra DeepSeek | P2 | Los live tests se saltean con key placeholder; el pipeline sí está cubierto con el cliente mockeado (`rag-oracle.test.ts`) |
| `AskOutput.fallback` reporta siempre `pgvector` | P3 | Quedó como valor fijo al borrar el fallback ILIKE |
| ROADMAP: Olas 10–12 pendientes | — | Crónicas, migración del Codex a React, deploy consolidado |

## Archivos relacionados
- `ROADMAP.md` — plan por olas
- `INDEX.md` — catálogo de documentación
- `doc/arch/bugs.md` — bug tracker
- `doc/arch/bitacora.md` — índice de sesiones
