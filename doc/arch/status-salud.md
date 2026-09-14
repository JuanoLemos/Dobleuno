# Estado de salud — Dobleuno

Generado por `/CBP` (fase `/salud`). Última corrida: 2026-09-14, sobre v1.2.0 + verificación del seed.

---

## Resumen

| Área | Estado | Detalle |
|---|---|---|
| Estructura | ✅ | `doc/` completo (arch, guias, mecanicas, plan, qa, legal) + ROADMAP y CHANGELOG en raíz |
| Links | ✅ | 0 links markdown relativos rotos en `doc/**` y la raíz |
| INDEX | ✅ | Todos los archivos catalogados existen en disco |
| Versión Diligencia | ✅ | Proyecto v4.3.1 == global v4.3.1 |
| Shell global | ✅ | shell-lock 45/45 sin cambios; `PENDING.md` vacío |
| Tests | ✅ | 167 server + 33 web + 5 pipeline, 11 live skip |
| Lint | ✅ | 0 errores, 0 warnings (`--max-warnings=0`) |
| Typecheck | ✅ | 0 errores en los 3 workspaces |
| CI | ✅ | Verde en `main`. lint → typecheck → migraciones → pgvector → seed → pipeline tests → server/web tests → builds |
| Temporales | ✅ | 0 versionados; los `.log` y `nppBackup/` locales están gitignored |
| Working tree | ✅ | Limpio, sincronizado con `origin/main` |
| Corpus en Postgres | ✅ | Verificado local: 1796 reglas · 751 items · 577 unidades · 3700 chunks, con `embedding_vec` poblado en los 3700 |

## Gaps documentales

| Gap | Severidad | Nota |
|---|---|---|
| ADRs 001–004 no existen | P3 | La numeración arranca en ADR-005; las decisiones previas viven en `doc/plan/PLAN.md` (D1–D14) |
| `bugs.md` e `incidentes.md` vacíos | P3 | Inicializados desde el template, sin entradas propias todavía |
| `doc/plan/PLAN.md` y `PLAN-OLEADAS.md` describen el portal Astro | P3 | Son registro histórico, no estado actual. Se dejan como están a propósito: reescribir un plan viejo borra el contexto de por qué se decidió lo que se decidió |

## Deuda técnica conocida

| Item | Severidad | Nota |
|---|---|---|
| **El oráculo no se probó punta a punta contra DeepSeek** | **P1** | Es lo único del Codex que sigue sin verificarse con datos reales. Al intentarlo, `POST /api/ask` colgó y la llamada murió con `UND_ERR_HEADERS_TIMEOUT` (timeout de headers de undici) sin respuesta del proveedor. No se determinó la causa: puede ser la API key, la red del autor o DeepSeek. Todo lo anterior del pipeline —retrieval sobre 3700 chunks con `embedding_vec`— sí quedó verificado |
| El entorno local de Postgres no es reproducible | P2 | No hay Docker: la base corre como `postgresql-16` + `postgresql-16-pgvector` dentro de WSL/Ubuntu, instalada a mano. Además WSL apaga la distro cuando no hay procesos y se lleva Postgres puesto, así que hay que sostenerla con un proceso vivo mientras se trabaja. `docker-compose.yml` sigue siendo la vía documentada y no se probó |
| El corpus está en inglés | P2 | El traductor está adaptado al corpus nuevo pero no corrió: son 2547 entradas de DeepSeek. `/sobre` lo declara cuando `rulesTranslated === 0` |
| Las unidades no tienen UI en el Codex | P2 | Las 577 están en la base y en `/api/units`, pero la Ola 11 cubrió reglas e items |
| El unit picker no distingue Core/Special/Rare | P2 | El sitio de origen no publica la categoría de lista de ejército, así que `CompositionValidator` no puede verificar los topes de Special y Rare. Ver el mapeo explícito en `apps/web/src/lib/units-api.ts` |
| `scripts/` no pasa por ESLint | P2 | `eslint.config.mjs` lo ignora entero porque ningún tsconfig lo cubre. Es el código que más fallas silenciosas produjo en este proyecto y es lo único sin chequeo estático. Pide un `tsconfig.scripts.json` |
| Los unfurls de Discord/WhatsApp no ven los meta tags | P3 | Esos bots no ejecutan JS y leen el `<head>` del `index.html`. Pide un middleware de Open Graph por user-agent en el server (ADR-011) |
| `AskOutput.fallback` reporta siempre `pgvector` | P3 | Quedó como valor fijo al borrar el fallback ILIKE |
| ROADMAP: Ola 12 pendiente | — | Deploy consolidado. Olas 0–11 cerradas |

## Archivos relacionados
- `ROADMAP.md` — plan por olas
- `INDEX.md` — catálogo de documentación
- `doc/arch/bugs.md` — bug tracker
- `doc/arch/bitacora.md` — índice de sesiones
