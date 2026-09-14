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
| `npm run rules:sync` | Pipeline completo: `mirror + parse + translate + copy a portal/src/data/` |
| `npm run portal:dev` | Levanta el portal Astro en `http://localhost:4321` |
| `npm run portal:build` | Build del portal estático a `portal/dist/` |

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

Ver [`docs/guias/deploy.md`](docs/guias/deploy.md) para guía completa (Hetzner VPS, Caddy/Nginx, Cloudflare Pages, backups, monitoring, volumen `dobleuno-kbdata` para v0.8.0+).

TL;DR:

```bash
docker compose up -d
curl http://localhost:3000/api/health
# Después de v0.8.0, el re-sync KB se hace vía admin endpoint, no más cron diario.
```

---

## Portal de reglas (Astro)

Adicional a la app mobile, hay un **portal estático** con el reglamento traducido y navegable. Pensado para:

- Buscar una regla rápido en el celu del rival.
- Imprimir una regla individual y tenerla al lado de la mesa.
- Compartir el link con un club que quiera consultar el reglamento en español.

### Estructura

```
Dobleuno/
├── data/
│   ├── raw/              # HTML scrapeado de tow.whfb.app (gitignored)
│   ├── processed/        # JSON parseado, en inglés (gitignored)
│   └── translated/       # JSON en español, cache de traducción (gitignored)
├── scripts/
│   ├── mirror-tow.ts     # Descarga HTML respetando robots.txt
│   ├── parse-tow.ts      # HTML → JSON (chequea con Zod)
│   ├── translate-tow.ts  # JSON en → JSON es con DeepSeek, cache por hash
│   └── rules-sync.ts     # Orquestador: corre los 3 + copia al portal
└── portal/               # Astro project — el sitio estático
    ├── src/
    │   ├── data/         # Copia de data/translated/ (gitignored)
    │   ├── pages/        # index, reglas/, items/, sobre
    │   ├── components/   # Sigil, RuleCard, ItemCard, SearchBox, Footer
    │   └── layouts/      # Base.astro
    └── public/           # favicon, etc.
```

### Getting the rules data

Para generar el contenido del portal (descarga + parse + traducción + copy):

```bash
# 1. Asegurate de tener DEEPSEEK_API_KEY en apps/server/.env
#    (también podés exportarla: export DEEPSEEK_API_KEY=sk-...)

# 2. Corré el pipeline completo
npm run rules:sync

# Flags útiles:
#   --skip-mirror       si ya tenés data/raw/ y no querés re-descargar
#   --skip-translate    si solo querés mirror + parse + copy (sin gastar LLM)
#   --type=rule|item    solo reglas o solo items
#   --force-translate   ignora cache de traducción
#   --concurrency=4     más paralelismo (default 2)
```

El script:
1. Descarga HTML de `tow.whfb.app` (rate limit 2s, respeta robots.txt, User-Agent identificable).
2. Parsea a JSON estructurado (chequea con Zod).
3. Traduce con DeepSeek, en batches de 8, con cache por hash del source.
4. Copia el resultado a `portal/src/data/`.

### Build & dev del portal

```bash
# Instalar Astro (la primera vez)
cd portal && npm install && cd ..

# Dev (auto-reload)
npm run portal:dev
# → http://localhost:4321

# Build de producción
npm run portal:build
# → portal/dist/  (sitio estático, listo para subir a cualquier hosting)
```

El sitio no necesita runtime: es HTML + CSS + JS estático. Lo podés servir con nginx, Caddy, GitHub Pages, Cloudflare Pages, etc.

### Costo y tiempo

Para traducir las ~38 reglas especiales y ~23 items mágicos del manifest actual:

- **Tiempo**: ~5-10 minutos (2-3 requests LLM en paralelo).
- **Costo DeepSeek**: ~$0.02-$0.05 (depende del largo de las descripciones).
- **Re-syncs incrementales** (solo cuando cambia el source): centavos, gracias al cache.

Si más adelante agregás unidades (60+ Empire + 50+ Bretonia), el costo escala linealmente. ~$0.50-$1.00 para todo el set.

### Disclaimer de marca

El portal declara explícitamente que Dobleuno es software libre, gratuito y no-comercial, y que no está afiliado a Games Workshop. Ver `/legal/terms` y `LICENSE.md` para los detalles.

---

## License

CC BY 4.0 — ver `LICENSE.md`.
Atribución a `tow.whfb.app` para el contenido de reglas — ver `docs/Sources.md`.
