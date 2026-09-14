# Dobleuno — Roadmap

> Roadmap vivo. Se actualiza al cerrar cada ola. Última: 2026-09-14 (v2.0.0).
>
> **Mapa de módulos visibles:** [`MODULES.md`](doc/MODULES.md). El "qué ve el usuario" vive ahí. Este doc es el "qué se construye" (técnico).

## Estado actual

**Ola 9 — Mesas** ✅ cerrada (v1.0.0). **Ola 10 — Crónicas** ✅ cerrada (v1.1.0).
**Ola 11 — Codex en React** ✅ cerrada (v1.2.0).
**Ola 12 — Deploy consolidado** ✅ cerrada (v2.0.0). Con el roadmap original completo, lo que sigue
se decide con el proyecto andando, no desde el plan de julio.

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
| **10** | **Crónicas (galería + AI stories)** | ✅ Cerrado | 3-4 | Upload fotos + DeepSeek story-gen + galería con visibilidad | v1.1.0 |
| **11** | **Codex en React** | ✅ Cerrado | 2-3 | Pipeline arreglado (3124 entradas reales) + Codex React con piel propia + `noindex` + portal retirado | v1.2.0 |
| **12** | **Deploy consolidado** | ✅ Cerrado | 2-3 | Un contenedor sirve API + cliente · imagen verificada en CI · config de producción endurecida | v2.0.0 |
| 7+ | Fase 2 | ⏳ Diferido | +3-4 sem | Historial, stats agregadas, coaching, +facciones, multiplayer | — |

## Métricas acumuladas (al cierre de v2.0.0)

| Métrica | Valor |
|---|---|
| Tests | 218 (180 server + 33 web + 5 pipeline) + 11 live skip |
| CI | 2 jobs: `test` (lint → typecheck → migraciones → tests → builds → bundle) y `docker` (imagen → compose → smoke → SQL) |
| Lint errors | 0 |
| Typecheck errors | 0 |
| Bundle web (main gzipped) | 180KB + vendor 53KB |
| Bundle BattleEdit (gzipped) | 3.72KB |
| Bundle codex-api (gzipped) | 34.54KB (incluye Dexie y el OraclePanel) |
| PWA precache | 565KB, 33 entries (offline-first funcional) |
| Corpus | 1796 reglas · 751 items · 577 unidades (3124 páginas bajadas, 0 fallidas) |
| Chunks en KB seed | ~3700 (1 por regla, 1 por item, 1-2 por unidad) — **sin verificar contra Postgres**, no hay Docker en la máquina del autor |
| Endpoints API | `/api/health` (+ `/ready`), `/api/auth`, `/api/lists`, `/api/battles`, `/api/ask`, `/api/admin/kb/{sync,status,logs}`, `/api/club`, `/api/mesas`, `/api/sesiones`, `/api/mis-reservas`, `/api/cronicas` (+ `/fotos`, `/generar`), `/api/media/cronicas`, `/api/rules` (+ `/sections`, `/:slug`), `/api/items` (+ `/types`, `/:slug`), `/api/units` (+ `/:id`), `/api/kb/{search,stats}`, `/api` (account) |
| DB tables | `user`, `session`, `account`, `verification`, `lists`, `battles`, `units`, `special_rules`, `magic_items`, `scenarios`, `ingest_log`, `kb_chunks` (+ columna `users.is_admin` en v0.8.0, + `club_info` en v0.9.0, + `mesas`, `sesiones`, `reservas` en v1.0.0, + `cronicas`, `cronica_fotos` en v1.1.0; `units`/`special_rules`/`magic_items` recreadas con taxonomía en texto libre + `name_es`/`description_es` en v1.2.0) |
| Mirror KB | Volumen `dobleuno-kbdata`. El sync por endpoint no funciona en la imagen de producción (v2.0.0): el corpus se copia al volumen, ver deploy.md |
| Imagen | Un contenedor sirve API + cliente, mismo origen. Verificada en CI, nunca en un servidor real |
| Brand kit | 9 piezas de arte en `apps/web/public/brand/` (~17 MB; la copia del portal se retiró en la Ola 11) |

## Referencias

- [`doc/MODULES.md`](doc/MODULES.md) — mapa de módulos visibles (Codex/Ejércitos/Mesas/Crónicas)
- `doc/plan/PLAN.md` — plan de alto nivel
- `doc/plan/PLAN-OLEADAS.md` — brief por ola (olas 0.5–7.1)
- `doc/arch/` — ADRs (incluye ADR-005 LLM provider)
- `doc/mecanicas/` — mecánicas TOW
- `doc/guias/deploy.md` — guía de deploy Hetzner + Cloudflare + volumen kbdata (v0.8.0+)
- `doc/Sources.md` — atribución tow.whfb.app
