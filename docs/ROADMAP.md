# Dobleuno — Roadmap

> Roadmap vivo. Se actualiza al cerrar cada ola. Última: 2026-07-08.

## Estado actual

**Ola 0.5 — Prompt v1** · en curso

## Olas

| # | Ola | Estado | Días planeados | Entregable |
|---|---|---|---|---|
| 0 | Decisiones | ✅ Cerrado | 1 | PLAN.md + decisiones locked |
| 0.5 | **Prompt v1** | ✅ Cerrado | 1-2 | System prompt + suite de regresión con DeepSeek |
| 1 | Foundation | 🟡 En curso | 5 | Monorepo, PWA installable, auth, dark mode brand |
| 2 | KB local | ⏳ Pendiente | 5 | Mirror tow.whfb.app + parser + búsqueda offline Empire+Bretonia |
| 3 | List builder | ⏳ Pendiente | 7 | UI lista + validación composición + save/load + export |
| 4 | Battle tracker | ⏳ Pendiente | 7 | 6 fases + combat resolver + magic + post-game |
| 5 | Rules oracle (RAG) | ⏳ Pendiente | 5 | Embeddings + RAG + endpoint /api/ask |
| 6 | Polish + deploy | ⏳ Pendiente | 5 | Lighthouse ≥90 + PWA mobile + Cloudflare + Hetzner |
| 7+ | Fase 2 | ⏳ Diferido | +3-4 sem | Historial, stats agregadas, coaching, +facciones |

## Ola 0.5 — Detalle

### Scope
- ✅ Setup mínimo `apps/server/` con TS + Vitest
- ✅ System prompt v0.1 (`apps/server/src/prompts/system.ts`)
- ✅ Tipos compartidos (`apps/server/src/prompts/types.ts`)
- ✅ CLI runner (`apps/server/src/prompts/runner.ts`)
- ✅ 10 preguntas canónicas (`apps/server/src/prompts/fixtures/questions.json`)
- ✅ Criterios de aceptación (`apps/server/src/prompts/fixtures/expected-answers.json`)
- ✅ Suite de tests (estática + live con API key)
- ✅ ADR-005 cerrado (DeepSeek V3/R1/V4 + OpenAI embeddings, SDK `openai`)
- ✅ Swap Anthropic→DeepSeek aplicado (costo ~20-30x menor)
- ✅ Mecánicas de referencia: composición, combate, magia
- ⏳ Pendiente: ejecutar suite live con DEEPSEEK_API_KEY del usuario
- ⏳ Pendiente: capturar resultados en `docs/qa/prompt-v0.1-results.md`

### Criterio de "done"
- [x] `tsc --noEmit` sin errores
- [x] `npm test` (estáticos) verde · **37/37 pass**, 11 live en skip
- [x] `npm test` (live con DEEPSEEK_API_KEY) — **10/10 pass** (confirmado por usuario)
- [x] Cero alucinaciones detectadas en la suite
- [ ] Latencia — **NO cumplido** para uso en partida real (~5-10s/pregunta). Arquitectura tiered (FAQs + KB + LLM) es la solución, planificada para Ola 5

## Referencias

- `docs/plan/PLAN.md` — plan de alto nivel
- `docs/plan/PLAN-OLEADAS.md` — brief por ola
- `docs/arch/` — ADRs
- `docs/mecanicas/` — mecánicas TOW
