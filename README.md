# Dobleuno

> Companion app de mesa para **Warhammer: The Old World**. Mobile-first PWA con asistente IA, tracker de batalla y KB de reglas offline.

**Estado:** Olas 0–5 cerradas · v0.6.0 desplegado. Ola 6 (polish + deploy) en curso.

---

## Stack

| Capa | Tech |
|---|---|
| Cliente | Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3.4 + PWA (vite-plugin-pwa) |
| Server | Node 22 + Express 4 + TypeScript 5 + Drizzle ORM |
| DB | PostgreSQL 16 + pgvector (embeddings para RAG) |
| Auth | better-auth (email/pass + sessions) |
| State (cliente) | Zustand |
| Local DB (cliente) | Dexie (IndexedDB) |
| LLM | DeepSeek V3/R1/V4 vía SDK `openai` (OpenAI-compatible) |
| Embeddings | swappable: OpenAI `text-embedding-3-small` (prod) / deterministic 384-dim (dev) |
| Package manager | **npm workspaces** (pnpm bloqueado por permisos del sistema) |
| CI | GitHub Actions |

Ver `docs/arch/SISTEMA.md` para arquitectura detallada.

---

## Estructura

Monorepo npm workspaces.

```
Dobleuno/
├── apps/
│   ├── web/          # Cliente PWA (Vite + React + Tailwind)
│   └── server/       # API (Express + Drizzle + better-auth)
├── packages/
│   └── shared/       # Tipos compartidos cliente ↔ server
├── docs/             # Documentación (Diligencia)
│   ├── arch/         # ADRs
│   ├── guias/        # Setup, deploy
│   ├── mecanicas/    # Reglas de TOW
│   ├── plan/         # PLAN, PLAN-OLEADAS
│   └── qa/           # Resultados de tests
├── data/             # Mirror de tow.whfb.app (gitignored)
├── scripts/          # Mirror + parse + bump-version
├── .github/          # CI
├── docker-compose.yml # Postgres (pgvector) + server
└── apps/server/Dockerfile
```

---

## Setup local

### Pre-requisitos

- Node.js 20 o 22 (recomendado 22)
- npm 10+ (incluido con Node 22)
- Docker (para Postgres local) o un Postgres con pgvector accesible

### Instalación

```bash
# Clonar
git clone https://github.com/JuanoLemos/Dobleuno.git
cd Dobleuno

# Instalar deps del monorepo
npm install --legacy-peer-deps
```

### Levantar Postgres

```bash
npm run db:up
# Espera ~5s a que esté healthy (usa la imagen pgvector/pgvector:pg16)
```

### Configurar .env

```bash
# Server
cp apps/server/.env.example apps/server/.env
# Editar apps/server/.env:
#   DATABASE_URL=postgres://dobleuno:dobleuno_dev@localhost:5432/dobleuno
#   DEEPSEEK_API_KEY=sk-...              # para LLM
#   OPENAI_API_KEY=sk-...                 # opcional, para embeddings reales

# Web
cp apps/web/.env.example apps/web/.env
# Editar apps/web/.env:
#   VITE_API_URL=http://localhost:3000
```

### Migrar DB

```bash
npm run db:migrate            # Drizzle migrations (schema)
npm run pgvector:install      # pgvector extension + indices (custom SQL)
npm run kb:seed               # Popular kb_chunks con 9 unidades + 5 reglas
```

### Dev

```bash
# Cliente + server en paralelo
npm run dev
# → http://localhost:5173 (cliente)
# → http://localhost:3000 (server)
```

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta cliente (5173) y server (3000) en paralelo |
| `npm run dev:web` | Solo cliente |
| `npm run dev:server` | Solo server |
| `npm run build` | Build de cliente + server |
| `npm test` | Corre tests de todos los workspaces (103 tests + 11 live skip) |
| `npm run test:web` | Tests del cliente (20 tests) |
| `npm run test:server` | Tests del server (83 tests) |
| `npm run lint` | ESLint en todo el monorepo (max-warnings=0) |
| `npm run typecheck` | TypeScript en todos los workspaces |
| `npm run format` | Prettier write |
| `npm run db:up` | Levanta Postgres + pgvector en Docker |
| `npm run db:down` | Apaga Postgres |
| `npm run db:migrate` | Aplica migraciones de Drizzle |
| `npm run pgvector:install` | Instala extension pgvector + indices |
| `npm run kb:seed` | Puebla kb_chunks con unidades + reglas seed |
| `npm run kb:rebuild` | Mirror + parse de tow.whfb.app |
| `npm run mirror` | Solo mirror |
| `npm run parse` | Solo parse |
| `npm run version:bump` | Bump version + commit + tag |

---

## Features por ola

| Ola | Qué | Estado | Tag |
|---|---|---|---|
| 0 | Decisiones + plan | ✅ | — |
| 0.5 | Prompt v1 con DeepSeek | ✅ | v0.1.0 |
| 1 | Foundation (monorepo, PWA, auth) | ✅ | v0.2.0 |
| 2 | KB local + mirror de tow.whfb.app | ✅ | v0.3.0 |
| 3 | List builder con validación | ✅ | v0.4.0 |
| 4 | Battle tracker | ✅ | v0.5.0 |
| 5 | Rules oracle con RAG (pgvector + DeepSeek) | ✅ | v0.6.0 |
| 6 | Polish + deploy (Hetzner + Cloudflare) | 🟡 | v0.7.0 (próximo) |

Ver `docs/plan/PLAN-OLEADAS.md` para detalle por ola.

---

## Brand

Inspirado en pergamino medieval y fragua oscura. Ver `docs/Sources.md`.

Paleta:
- **forge** `#0a0a0a` — fondo de la app (dark mode)
- **blood** `#a01919` — acento principal (CTAs, badges, errores)
- **bronze** `#b8860b` — acento secundario (citas, separadores, detalles heraldicos)
- **parchment** `#f7f5f0` — texto principal en dark, fondo en light
- **ink** `#14171e` — texto en light mode

Tipografía:
- **DM Serif Display** — headlines, branding
- **Outfit** — body, UI
- **JetBrains Mono** — stats, dados, números

Sigilo "2·1" en heater shield (ver portal v0).

---

## Deploy

Ver [`docs/guias/deploy.md`](docs/guias/deploy.md) para guía completa (Hetzner VPS, Caddy/Nginx, Cloudflare Pages, backups, monitoring).

TL;DR:

```bash
docker compose up -d
curl http://localhost:3000/api/health
```

---

## License

CC BY 4.0 — ver `LICENSE.md`.
Atribución a `tow.whfb.app` para el contenido de reglas — ver `docs/Sources.md`.