# Sistema Dobleuno

> Documento vivo de arquitectura. Última: 2026-09-14 (v1.1.0 — Ola 10, Crónicas).

## Vista general

Dobleuno es un sistema cliente-servidor para asistir a un jugador de Warhammer: The Old World
durante una partida en mesa, y para coordinar las mesas de un club. El cliente es una PWA
mobile-first; el server es un backend Node con BD relacional + vector store + LLM. El reglamento
navegable (el Codex) vive dentro de la misma app desde la Ola 11: el portal Astro que lo servía
se retiró (ADR-011).

Un deploy = un club (single-tenant). Multi-club queda para Fase 2.

## Diagrama de componentes

```
┌──────────────────────────┐                ┌─────────────────────────────────┐
│ Cliente PWA (mobile)     │                │ Server (Node 22)                │
│ Vite + React 18 + TS     │                │ Express 4 + TypeScript 5        │
│ Tailwind 3.4 · PWA       │                │                                 │
│ Zustand · Dexie          │  HTTPS REST    │ /api/auth      (better-auth)    │
│ React Router 6           │ ─────────────► │ /api/health    (GET)            │
│                          │                │ /api/lists     (CRUD, Ola 3)    │
│ TabShell (Ola 8)         │                │ /api/battles   (CRUD, Ola 4)    │
│  Codex · Ejércitos       │                │ /api/rules|items|units (Ola 11) │
│  Mesas · Crónicas        │                │ /api/kb/{search,stats} (Ola 11) │
│                          │                │ /api/ask       (RAG, Ola 5)     │
│ Service Worker           │                │ /api/admin/kb/* (Ola 7.1)       │
│ (offline-first)          │                │ /api/club      (Ola 8)          │
│                          │                │ /api/mesas     (Ola 9)          │
└──────────────────────────┘                │ /api/sesiones  (Ola 9)          │
                                            │ /api/mis-reservas (Ola 9)       │
┌──────────────────────────┐                │ /api/cronicas  (Ola 10)         │
│ Codex (piel propia)      │                │ /api/media/cronicas (estático)  │
│ /reglas · /items · /sobre│                │ + account (perfil de usuario)   │
│ Público, con noindex     │                │                                 │
│ Cache en IndexedDB       │                │ SPA fallback: sirve             │
└──────────────────────────┘                │ apps/web/dist si existe         │
                                            │ (WEB_DIST_DIR configurable)     │
                                            │                                 │
                                            │ ┌──────────────────────┐        │
                                            │ │ PostgreSQL 16        │        │
                                            │ │ + pgvector (Ola 5)   │        │
                                            │ │                      │        │
                                            │ │ user (is_admin) ·    │        │
                                            │ │ session · account ·  │        │
                                            │ │ verification         │        │
                                            │ │ lists · battles      │        │
                                            │ │ units · special_rules│        │
                                            │ │ magic_items ·        │        │
                                            │ │ scenarios            │        │
                                            │ │ kb_chunks ·          │        │
                                            │ │ ingest_log           │        │
                                            │ │ club_info   (Ola 8)  │        │
                                            │ │ mesas · sesiones ·   │        │
                                            │ │ reservas    (Ola 9)  │        │
                                            │ │ cronicas ·           │        │
                                            │ │ cronica_fotos        │        │
                                            │ │             (Ola 10) │        │
                                            │ │                      │        │
                                            │ │ dobleuno-kbdata      │        │
                                            │ │ (cache KB)           │        │
                                            │ │ dobleuno-uploads     │        │
                                            │ │ (fotos, Ola 10)      │        │
                                            │ └──────────────────────┘        │
                                            │                                 │
                                            │ ┌──────────────────────┐        │
                                            │ │ mirror-tow (admin)   │        │
                                            │ │ POST /api/admin/kb/  │        │
                                            │ │ sync (Ola 7.1)       │        │
                                            │ │ → KB + embeddings    │        │
                                            │ └──────────────────────┘        │
                                            │                                 │
                                            │ ┌──────────────────────┐        │
                                            │ │ DeepSeek client      │───────►│ DeepSeek API
                                            │ │ (SDK openai)         │        │ (chat, OAI-compatible)
                                            │ └──────────────────────┘        │
                                            └─────────────────────────────────┘
```

- `dobleuno-kbdata` (volumen docker) — cache del mirror parseado, montado en `server:/app/data`.
  Persiste entre reinicios para evitar re-descarga de tow.whfb.app.
- **SPA fallback** (semilla de Ola 11): si existe el build del cliente, el server lo sirve y
  cualquier ruta fuera de `/api` devuelve `index.html`. Permite un solo origen en producción.

## Pipeline del oráculo (Ola 5, corregido en v1.0.2)

```
pregunta → embed (provider swappable) → retrieval pgvector (cosine, top-K)
         → prompt con chunks numerados → DeepSeek → extracción y validación de citas
```

- **pgvector es requisito duro.** El fallback a búsqueda textual se eliminó en v1.0.2: armaba
  términos ILIKE a partir de los números del vector, así que devolvía filas arbitrarias. Sin la
  extensión instalada el retrieval devuelve vacío y el oráculo contesta que no tiene información
  suficiente, en vez de citar contexto casual.
- **Citas validadas contra los chunks reales**: `[cita:N]` fuera de rango se descarta, las
  repetidas se deduplican. El modelo no puede inventar una fuente.
- Embeddings: OpenAI `text-embedding-3-small` en producción; provider determinístico de 384
  dims en dev/test (no requiere API key ni red).

## Capas del cliente

| Capa | Tech | Por qué |
|---|---|---|
| Build | Vite 5.4.11 | Hot reload rápido, PWA plugin maduro |
| UI | React 18 + TS 5 | Ecosistema maduro, type-safe |
| Estilos | Tailwind 3.4 | Mobile-first, utility-first, paleta custom |
| Routing | React Router 6 | Data router con loaders |
| Shell | TabShell (Ola 8) | Header sticky con tabs; reemplazó al bottom-nav (ADR-007) |
| Estado global | Zustand | Liviano, sin Redux ceremony |
| Local DB | Dexie 4 | IndexedDB con schema y queries |
| Forms | React Hook Form + Zod | Estándar, type-safe |
| PWA | vite-plugin-pwa + Workbox | Service worker, precaching, manifest |
| i18n | react-intl | es-AR por default, en fallback |
| HTTP | fetch + wrapper fino | Sin axios, simple |
| Testing | Vitest + Testing Library | Mismo ecosistema Vite |

## Capas del server

| Capa | Tech | Por qué |
|---|---|---|
| Runtime | Node 22 | LTS, el que fija `.nvmrc` y usa el CI |
| Framework | Express 4 | Conocido, sin riesgo |
| Lenguaje | TypeScript 5 | Mismo stack que cliente |
| ORM | Drizzle | Type-safe, SQL-first, ideal con pgvector |
| DB | PostgreSQL 16 + pgvector | Relacional maduro, vector store integrado |
| Auth | better-auth | Email/pass + verification + reset out-of-box |
| Embeddings | OpenAI `text-embedding-3-small` | Barato, suficiente calidad |
| LLM | DeepSeek V3/R1 (vía SDK openai) | ~20-30x más barato que Claude, OpenAI-compatible |
| Validación | Zod | Mismo que cliente, tipos compartidos |
| Testing | Vitest | Mismo que cliente |

## Codex y su pipeline de contenido

El Codex son cinco rutas de la app React (`/reglas`, `/reglas/:slug`, `/items`, `/items/:slug`,
`/sobre`) con una piel propia aplicada por ruta: `CodexLayout` pone `data-skin="codex"` en el body
al montar y lo saca al desmontar. El resto de la app no se entera.

El pipeline que lo alimenta:

```
mirror-tow      manifest desde los 3 sitemaps del sitio → data/raw/<kind>/<slug>.json
parse-tow       → data/processed/{rules,magic-items,units}.json
validate-corpus corta con exit 1 si el corpus salió degenerado
translate-tow   → data/translated/ (DeepSeek, cache por hash del source)
validate-corpus otra vez, sobre el traducido
kb:seed         → Postgres: special_rules · magic_items · units · kb_chunks
```

El paso de validación no es decorativo: entre la Ola 2 y la Ola 11 el pipeline terminó con exit 0
durante dos meses escribiendo 39 entradas basura, porque el mirror bajaba el shell de carga de
Next.js en vez de las páginas.

El corpus **no se bundlea**: viaja del server al IndexedDB del usuario (Dexie v3), que es lo que
permite leerlo sin señal. Las rutas llevan `noindex` (ADR-011).

## Decisiones arquitectónicas cerradas (ADRs)

Los ADR existen como archivo desde el 005. Las decisiones previas (D1–D14: monorepo, fuente de
reglas, backend + LLM, hosting) están en `doc/plan/PLAN.md`, no como ADR propio.

| ADR | Decisión |
|---|---|
| [ADR-005](ADR-005-llm-provider.md) | LLM provider: DeepSeek + embeddings de OpenAI |
| [ADR-006](ADR-006-react-single-source.md) | React app como single source of truth post-login (cláusula de SEO superada por ADR-011) |
| [ADR-007](ADR-007-tabs-naming.md) | Naming de módulos en español (Codex / Ejércitos / Mesas / Crónicas) |
| [ADR-008](ADR-008-club-info-model.md) | Modelo de datos del club: single-row, single-tenant |
| [ADR-009](ADR-009-calendar-data-model.md) | Calendar: mesas / sesiones / reservas + anti-doble-booking |
| [ADR-010](ADR-010-cronicas-data-model.md) | Crónicas: tablas propias, storage local con capability URLs, relato anclado a la partida |
| [ADR-011](ADR-011-codex-react-noindex.md) | Codex en React con `noindex`; portal Astro retirado |

La decisión de **KB sync vía endpoint admin** (Ola 7.1) reemplazó al cron diario por un job
queue in-memory triggereable con `POST /api/admin/kb/sync`, con cache persistente en el volumen
`dobleuno-kbdata`. Está documentada en el CHANGELOG de v0.8.0, no en un ADR propio.

## Principios

1. **Cliente offline-first** para Listas, Batalla y Reglas. La IA requiere red.
2. **Server stateless** salvo Postgres. Sesiones de better-auth, sin estado en memoria (salvo
   el job queue del KB sync, deliberadamente efímero).
3. **La IA no inventa fuentes**: sin contexto recuperado el oráculo no llama al LLM, y toda cita
   se valida contra los chunks reales. Las crónicas siguen la misma regla con sus anclas a
   unidades y hitos de la partida.
4. **Brand consistency**: paleta forge/blood/bronze en la app, parchment en la home cream, y la piel `codex` (tinta y oro) en el reglamento.
5. **Mobile-first**: 360px de ancho mínimo, touch targets ≥ 44px, tabs sticky.
6. **TZ**: el server guarda en UTC; la UI formatea en `America/Buenos_Aires`.

## Verificación

| Check | Estado |
|---|---|
| Tests | 186 (153 server + 33 web) + 11 live skip |
| Lint | ESLint flat config, `--max-warnings=0` |
| Typecheck | 3 workspaces, 0 errores |
| CI | lint → typecheck → migraciones → pgvector → seed KB → tests → builds → artefacto |

El CI corre contra `pgvector/pgvector:pg16` con el esquema migrado y la KB seedeada (23
chunks), así que los caminos contra base se ejercitan de verdad.

## Costos mensuales (1 usuario activo)

| Componente | Estimación | Costo/mes |
|---|---|---|
| Hetzner CX22 (server) | — | €5 |
| Cloudflare Pages (cliente) | — | $0 |
| DeepSeek V3 chat (100 preg/día) | ~3M input + 1.5M output | ~$0.42 |
| DeepSeek R1 (5% de las preguntas) | ~150K input + 75K output | ~$0.30 |
| OpenAI embeddings (1 update/semana) | ~200K tokens | ~$0.01 |
| Dominio (.app) | anual | ~$10/año |
| **Total** | | **~$5.73/mes + dominio** |

## Archivos relacionados
- `ROADMAP.md` — plan por olas
- `doc/MODULES.md` — qué ve el usuario en cada módulo
- `doc/guias/deploy.md` — deploy en Hetzner + Cloudflare
- `doc/arch/status-salud.md` — diagnóstico de salud
