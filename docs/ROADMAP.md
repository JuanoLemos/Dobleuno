# Dobleuno — Roadmap

> Roadmap vivo. Se actualiza al cerrar cada ola. Última: 2026-07-09 (v0.6.0).

## Estado actual

**Ola 5 — Rules Oracle RAG** ✅ cerrada. **Ola 6 — Polish + Deploy** 🟡 en curso.

## Olas

| # | Ola | Estado | Días planeados | Entregable | Tag |
|---|---|---|---|---|---|
| 0 | Decisiones | ✅ Cerrado | 1 | PLAN.md + decisiones locked | — |
| 0.5 | Prompt v1 | ✅ Cerrado | 1-2 | System prompt + suite de regresión con DeepSeek | v0.1.0 |
| 1 | Foundation | ✅ Cerrado | 5 | Monorepo, PWA installable, auth, dark mode brand | v0.2.0 |
| 2 | KB local | ✅ Cerrado | 5 | Mirror tow.whfb.app + parser + búsqueda offline Empire+Bretonia | v0.3.0 |
| 3 | List builder | ✅ Cerrado | 7 | UI lista + validación composición + save/load + export | v0.4.0 |
| 4 | Battle tracker | ✅ Cerrado | 7 | 6 fases + combat resolver + post-game + Monte Carlo | v0.5.0 |
| 5 | Rules oracle (RAG) | ✅ Cerrado | 5 | pgvector + embeddings + /api/ask + citation enforcement | v0.6.0 |
| 6 | Polish + deploy | 🟡 En curso | 5 | Lighthouse + Dockerfile + docker-compose + deploy guide | v0.7.0 |
| 7+ | Fase 2 | ⏳ Diferido | +3-4 sem | Historial, stats agregadas, coaching, +facciones, multiplayer | — |

## Métricas acumuladas

| Métrica | Valor |
|---|---|
| Tests | 103 (83 server + 20 web) + 11 live skip |
| Lint errors | 0 |
| Typecheck errors | 0 |
| Bundle web (main gzipped) | 180KB + vendor 53KB |
| Bundle BattleEdit (gzipped) | 3.72KB |
| Bundle Reglas (gzipped) | 37.16KB (incluye OraclePanel) |
| PWA precache | 565KB, 33 entries |
| Chunks en KB seed | ~28 (9 unidades + 5 reglas básicas) |
| Endpoints API | health + auth + lists + battles + rules + units + items + kb/stats + ask |
| DB tables | user + session + account + verification + lists + battles + units + special_rules + magic_items + scenarios + ingest_log + kb_chunks |

## Referencias

- `docs/plan/PLAN.md` — plan de alto nivel
- `docs/plan/PLAN-OLEADAS.md` — brief por ola
- `docs/arch/` — ADRs (incluye ADR-005 LLM provider)
- `docs/mecanicas/` — mecánicas TOW
- `docs/guias/deploy.md` — guía de deploy Hetzner + Cloudflare
- `docs/SOURCES.md` — atribución tow.whfb.app
