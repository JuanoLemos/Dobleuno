# Estado de salud — Dobleuno

Generado por `/CBP` (fase `/salud`). Última corrida: 2026-09-14, sobre v1.2.0.

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

## Gaps documentales

| Gap | Severidad | Nota |
|---|---|---|
| ADRs 001–004 no existen | P3 | La numeración arranca en ADR-005; las decisiones previas viven en `doc/plan/PLAN.md` (D1–D14) |
| `bugs.md` e `incidentes.md` vacíos | P3 | Inicializados desde el template, sin entradas propias todavía |
| `doc/plan/PLAN.md` y `PLAN-OLEADAS.md` describen el portal Astro | P3 | Son registro histórico, no estado actual. Se dejan como están a propósito: reescribir un plan viejo borra el contexto de por qué se decidió lo que se decidió |

## Deuda técnica conocida

| Item | Severidad | Nota |
|---|---|---|
| **El seed del corpus no se verificó contra Postgres** | **P1** | No hay Docker en la máquina del autor. El CI sí aplica las migraciones `0005`–`0007` (DROP + CREATE de las tres tablas del Codex) y pasan, pero no corre `kb:seed`: `data/processed/` está gitignored, así que el runner no tiene corpus y el step usa `--allow-missing`. El camino de éxito del Codex — API con datos reales — nunca se ejecutó |
| El corpus está en inglés | P2 | El traductor está adaptado al corpus nuevo pero no corrió: son 2547 entradas de DeepSeek. `/sobre` lo declara cuando `rulesTranslated === 0` |
| Las unidades no tienen UI en el Codex | P2 | Las 577 están en la base y en `/api/units`, pero la Ola 11 cubrió reglas e items |
| El unit picker no distingue Core/Special/Rare | P2 | El sitio de origen no publica la categoría de lista de ejército, así que `CompositionValidator` no puede verificar los topes de Special y Rare. Ver el mapeo explícito en `apps/web/src/lib/units-api.ts` |
| `scripts/` no pasa por ESLint | P2 | `eslint.config.mjs` lo ignora entero porque ningún tsconfig lo cubre. Es el código que más fallas silenciosas produjo en este proyecto y es lo único sin chequeo estático. Pide un `tsconfig.scripts.json` |
| Los unfurls de Discord/WhatsApp no ven los meta tags | P3 | Esos bots no ejecutan JS y leen el `<head>` del `index.html`. Pide un middleware de Open Graph por user-agent en el server (ADR-011) |
| El oráculo no se prueba punta a punta contra DeepSeek | P2 | Los live tests se saltean con key placeholder; el pipeline sí está cubierto con el cliente mockeado (`rag-oracle.test.ts`) |
| `AskOutput.fallback` reporta siempre `pgvector` | P3 | Quedó como valor fijo al borrar el fallback ILIKE |
| ROADMAP: Ola 12 pendiente | — | Deploy consolidado. Olas 0–11 cerradas |

## Archivos relacionados
- `ROADMAP.md` — plan por olas
- `INDEX.md` — catálogo de documentación
- `doc/arch/bugs.md` — bug tracker
- `doc/arch/bitacora.md` — índice de sesiones
