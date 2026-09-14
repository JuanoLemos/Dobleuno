# Dobleuno

> Companion app de mesa para **Warhammer: The Old World**. Mobile-first PWA con asistente IA, tracker de batalla y KB de reglas offline.

**Project intent:** Dobleuno es **software libre, gratuito y de uso no-comercial**, desarrollado para mejorar la calidad de juego en clubes de Warhammer: The Old World. No monetiza al usuario final. Si Games Workshop quisiera incorporar o relicenciar el proyecto, sería a través de una negociación separada con el autor.

**Estado:** Olas 0–6 + 7.1 cerradas · v0.8.0 desplegado.

---

## Stack

| Capa | Tech |
|---|---|
| Cliente | Vite 5.4 + React 18 + TypeScript 5 + Tailwind CSS 3.4 + PWA (vite-plugin-pwa) |
| Server | Node 22 + Express 4 + TypeScript 5 + Drizzle ORM |
| DB | PostgreSQL 16 + pgvector (embeddings para RAG) |
| Auth | better-auth (email/pass + sessions + admin vía `ADMIN_EMAILS`) |
| State (cliente) | Zustand |
| Local DB (cliente) | Dexie (IndexedDB) |
| LLM | DeepSeek V3/R1/V4 vía SDK `openai` (OpenAI-compatible) |
| Embeddings | swappable: OpenAI `text-embedding-3-small` (prod) / deterministic 384-dim (dev) |
| Package manager | **npm workspaces** (pnpm bloqueado por permisos del sistema) |
| CI | GitHub Actions |

Ver `doc/arch/SISTEMA.md` para arquitectura detallada.

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
├── doc/             # Documentación (Diligencia)
│   ├── arch/         # ADRs
│   ├── guias/        # Setup, deploy
│   ├── mecanicas/    # Reglas de TOW
│   ├── plan/         # PLAN, PLAN-OLEADAS
│   └── qa/           # Resultados de tests
├── data/             # Mirror de tow.whfb.app (gitignored, persistido en docker-compose)
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
#   OPENAI_API_KEY=sk-...                # opcional, para embeddings reales
#   ADMIN_EMAILS=tu@email.com            # opcional, usuario promovido a admin al boot

# Web
cp apps/web/.env.example apps/web/.env
# Editar apps/web/.env:
#   VITE_API_URL=http://localhost:3000
```

### Migrar DB

```bash
npm run db:migrate                                          # Drizzle migrations (schema)
npm run pgvector:install -w @dobleuno/server                # pgvector extension + indices (custom SQL)
npm run kb:seed -w @dobleuno/server                         # Popular kb_chunks con 9 unidades + 5 reglas
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
| `npm test` | Corre tests de todos los workspaces (108 tests + 11 live skip) |
| `npm run test:web` | Tests del cliente (20 tests) |
| `npm run test:server` | Tests del server (88 tests) |
| `npm run lint` | ESLint en todo el monorepo (max-warnings=0) |
| `npm run typecheck` | TypeScript en todos los workspaces |
| `npm run format` | Prettier write |
| `npm run db:up` | Levanta Postgres + pgvector en Docker |
| `npm run db:down` | Apaga Postgres |
| `npm run db:migrate` | Aplica migraciones de Drizzle |
| `npm run pgvector:install -w @dobleuno/server` | Instala extension pgvector + indices |
| `npm run kb:seed -w @dobleuno/server` | Puebla kb_chunks con unidades + reglas seed |
| `npm run kb:rebuild` | Mirror + parse de tow.whfb.app (CLI legacy — preferir `/api/admin/kb/sync` en prod) |
| `npm run mirror` | Solo mirror |
| `npm run parse` | Solo parse |
| `npm run version:bump` | Bump version + commit + tag |
| `curl -X POST http://localhost:3000/api/admin/kb/sync -H "Cookie: $SESSION"` | Dispara re-sync KB en background (requiere admin) |
| `npm run translate` | Traduce las reglas (inglés → español) usando DeepSeek. Cache por hash, no re-traduce lo que no cambió. |
| `npm run rules:sync` | Pipeline completo: mirror → parse → validate → translate → validate |

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
| 6 | Polish + deploy (Hetzner + Cloudflare + Dockerfile) | ✅ | v0.7.0 |
| 7.1 | KB sync admin (background + persist + cache docker) | ✅ | v0.8.0 |

Ver `doc/plan/PLAN-OLEADAS.md` para detalle por ola.

---

## Brand

Inspirado en pergamino medieval y fragua oscura. Ver `doc/Sources.md`.

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

Sigilo "2·1" en heater shield.

---

## Deploy

Ver [`doc/guias/deploy.md`](doc/guias/deploy.md) para guía completa (Hetzner VPS, Caddy/Nginx, Cloudflare Pages, backups, monitoring, volumen `dobleuno-kbdata` para v0.8.0+).

TL;DR:

```bash
docker compose up -d
curl http://localhost:3000/api/health
# Después de v0.8.0, el re-sync KB se hace vía admin endpoint, no más cron diario.
```

---

## El Codex y su pipeline

El reglamento navegable vive en la app, en `/reglas` y `/items`. Sirve para:

- Buscar una regla rápido en el celu, al lado de la mesa.
- Imprimir una regla individual (`@media print` deja solo la ficha).
- Leerla sin señal: lo que navegaste queda cacheado en el dispositivo.

Hasta la v1.1.0 esto era un sitio Astro aparte (`portal/`), que nunca se desplegó. Se retiró en la
Ola 11; su última versión está en el tag `v1.1.0`. Ver
[ADR-011](doc/arch/ADR-011-codex-react-noindex.md).

Las rutas del Codex son públicas pero llevan `noindex`: el contenido deriva de publicaciones de
Games Workshop y el análisis legal del proyecto lo marca como riesgo latente.

### Estructura del pipeline

```
Dobleuno/
├── data/
│   ├── raw/              # JSON de cada página de tow.whfb.app (gitignored)
│   ├── processed/        # Corpus normalizado, en inglés (gitignored)
│   └── translated/       # Corpus en español + cache de traducción (gitignored)
└── scripts/
    ├── mirror-tow.ts     # Baja el sitio respetando robots.txt (manifest = sus sitemaps)
    ├── parse-tow.ts      # JSON crudo → corpus normalizado
    ├── validate-corpus.ts# Corta si el corpus salió degenerado
    ├── translate-tow.ts  # Traduce con DeepSeek, cache por hash del source
    └── rules-sync.ts     # Orquestador de los cuatro
```

### Bajar el corpus

```bash
# 1. DEEPSEEK_API_KEY en apps/server/.env si querés el paso de traducción.

# 2. Pipeline completo
npm run rules:sync

# Flags útiles:
#   --skip-mirror       ya tenés data/raw/ y no querés re-descargar
#   --skip-translate    mirror + parse + validate, sin gastar LLM
#   --kind=rule|item|unit
#   --force             re-baja lo cacheado
#   --concurrency=4     más paralelismo en la traducción (default 2)

# 3. Cargarlo en Postgres
npm run kb:seed -w @dobleuno/server
```

El mirror completo son ~3124 páginas a 2s de rate limit: alrededor de hora y media, una sola vez,
con cache en disco. El validador corre antes y después de traducir, y corta con exit 1 si el
corpus salió degenerado — existe porque el pipeline terminó en verde durante dos meses escribiendo
39 entradas basura y nadie abrió el JSON.

### Costo de la traducción

El corpus son 1796 reglas y 751 items. En batches de 8 con cache por hash, la corrida completa es
del orden de unos pocos dólares de DeepSeek; los re-syncs incrementales, centavos. Las unidades no
se traducen: son statlines y nombres propios.

### Disclaimer de marca

Dobleuno es software libre, gratuito y no-comercial, y no está afiliado ni respaldado por Games
Workshop. Ver `/sobre`, `/legal/terms` y `LICENSE.md`.

---

## License

CC BY 4.0 — ver `LICENSE.md`.
Atribución a `tow.whfb.app` para el contenido de reglas — ver `doc/Sources.md`.
