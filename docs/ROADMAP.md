# Dobleuno — Roadmap

> Roadmap vivo. Se actualiza al cerrar cada ola. Última: 2026-09-13 (v1.0.0).
>
> **Mapa de módulos visibles:** [`MODULES.md`](./MODULES.md). El "qué ve el usuario" vive ahí. Este doc es el "qué se construye" (técnico).

## Estado actual

**Ola 8 — Home del club + TabShell** ✅ cerrada (v0.9.0). **Ola 9 — Mesas** ✅ cerrada (v1.0.0).

El release v1.0.0 se cerró el 2026-09-13, arrastrando también trabajo temprano de Olas 10–11 que
estaba en el árbol sin commitear (Home cream editorial y SPA fallback del server). Ver CHANGELOG.

### Ola 0.6 — UI v2 + Branding IA (post-v0.8.0, pre-Ola 8)

✅ cerrada 2026-07-10. Después de cerrar Ola 7.1 y antes de planificar Fase 2, replanificamos con el usuario:

- Portal Astro recibió un rebrand visual completo: 2 pieles (Cartógrafo + Codex) × 2 modos (light/dark), 5 páginas escritas (home, /reglas, /reglas/[slug], /items, /items/[slug], /sobre), Base layout con skin prop + FOUC-safe pre-paint + mode toggle.
- Brand kit generado con Matrix MiniMax: 3 escudos (heraldic-dark, illuminated, cartography-engraved) + 3 hero backgrounds (cartografo, codex, armybuilder-dark) + 1 escena ambient (battle-council) + 2 tiles (iron-plate, leather-tome). Aplicado a portal + login + cards del armybuilder.
- Branding persistido en `apps/web/public/brand/` (servido desde Vite) y replicado en `portal/public/brand/` (servido desde Astro).
- Fix de regresión: la regla `.grain { opacity }` se aplicaba al body entero, dejando texto fantasma. Migrada a `body::before { position: fixed }` para afectar solo el fondo.
- Skill `windows-shell` creada en el agente (`~/.mavis/agents/mavis/skills/windows-shell/SKILL.md`) con tabla de ConsoleColor, codificación PowerShell, y atajos.

## Olas

| # | Ola | Estado | Días planeados | Entregable | Tag |
|---|---|---|---|---|---|
| 0 | Decisiones | ✅ Cerrado | 1 | PLAN.md + decisiones locked | — |
| 0.5 | Prompt v1 | ✅ Cerrado | 1-2 | System prompt + suite de regresión con DeepSeek | v0.1.0 |
| 0.6 | UI v2 + Branding IA | ✅ Cerrado | 1 | Portal rebrand + brand kit generado | v0.8.1 |
| 1 | Foundation | ✅ Cerrado | 5 | Monorepo, PWA installable, auth, dark mode brand | v0.2.0 |
| 2 | KB local | ✅ Cerrado | 5 | Mirror tow.whfb.app + parser + búsqueda offline Empire+Bretonia | v0.3.0 |
| 3 | List builder | ✅ Cerrado | 7 | UI lista + validación composición + save/load + export | v0.4.0 |
| 4 | Battle tracker | ✅ Cerrado | 7 | 6 fases + combat resolver + post-game + Monte Carlo | v0.5.0 |
| 5 | Rules oracle (RAG) | ✅ Cerrado | 5 | pgvector + embeddings + /api/ask + citation enforcement | v0.6.0 |
| 6 | Polish + deploy | ✅ Cerrado | 5 | Dockerfile multi-stage + docker-compose pgvector + deploy guide | v0.7.0 |
| 7.1 | KB sync admin (post-MVP) | ✅ Cerrado | 1-2 | `/api/admin/kb/sync` background + kb-ingest + cache docker + is_admin | v0.8.0 |
| **8** | **Home del club + shell con tabs** | ✅ Cerrado | 2-3 | Landing pública con info del club + TabShell con tabs (Codex/Ejércitos/Mesas/Crónicas) | v0.9.0 |
| **9** | **Mesas (calendar multi-mesa)** | ✅ Cerrado | 3-4 | API + UI admin + UI jugador + roles + anti-doble-booking | v1.0.0 |
| **10** | **Crónicas (galería + AI stories)** | ⏳ Pendiente | 3-4 | Upload fotos + DeepSeek story-gen + vista galería | v1.1.0 |
| **11** | **Migración Codex portal → app** | ⏳ Pendiente | 2-3 | Portear páginas Astro a React, mantener SEO si posible | v1.2.0 |
| **12** | **Polish + deploy consolidado** | ⏳ Pendiente | 2-3 | Deploy unificado (app + portal + landing) | v2.0.0 |
| 7+ | Fase 2 | ⏳ Diferido | +3-4 sem | Historial, stats agregadas, coaching, +facciones, multiplayer | — |

## Métricas acumuladas (al cierre de v1.0.0)

| Métrica | Valor |
|---|---|
| Tests | 130 (104 server + 26 web) + 11 live skip |
| Lint errors | 0 |
| Typecheck errors | 0 |
| Bundle web (main gzipped) | 180KB + vendor 53KB |
| Bundle BattleEdit (gzipped) | 3.72KB |
| Bundle Reglas (gzipped) | 37.16KB (incluye OraclePanel) — sin re-medir post-v0.8.0 |
| PWA precache | 565KB, 33 entries (offline-first funcional) |
| Chunks en KB seed | 23 (9 unidades × 2 chunks + 5 reglas básicas) — verificado en CI; re-sync admin puede ampliar |
| Endpoints API | `/api/health`, `/api/auth`, `/api/lists`, `/api/battles`, `/api/ask`, `/api/admin/kb/{sync,status,logs}`, `/api/club`, `/api/mesas`, `/api/sesiones`, `/api/mis-reservas` + `/api` (rulesRouter, account) |
| DB tables | `user`, `session`, `account`, `verification`, `lists`, `battles`, `units`, `special_rules`, `magic_items`, `scenarios`, `ingest_log`, `kb_chunks` (+ columna `users.is_admin` en v0.8.0, + `club_info` en v0.9.0, + `mesas`, `sesiones`, `reservas` en v1.0.0) |
| Mirror KB | Volumen `dobleuno-kbdata` (persiste entre reinicios), job queue in-memory |
| Brand kit | 9 piezas de arte en `apps/web/public/brand/` + `portal/public/brand/` (~33 MB) |

## Referencias

- [`docs/MODULES.md`](./MODULES.md) — mapa de módulos visibles (Codex/Ejércitos/Mesas/Crónicas)
- `docs/plan/PLAN.md` — plan de alto nivel
- `docs/plan/PLAN-OLEADAS.md` — brief por ola (olas 0.5–7.1)
- `docs/arch/` — ADRs (incluye ADR-005 LLM provider)
- `docs/mecanicas/` — mecánicas TOW
- `docs/guias/deploy.md` — guía de deploy Hetzner + Cloudflare + volumen kbdata (v0.8.0+)
- `docs/Sources.md` — atribución tow.whfb.app
