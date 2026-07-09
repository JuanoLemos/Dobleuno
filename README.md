# Dobleuno

> Companion app de mesa para **Warhammer: The Old World**. Mobile-first PWA con asistente IA, tracker de batalla y KB de reglas offline.

**Estado:** Ola 1 en ejecución · MVP target 4-5 semanas.

---

## Stack

| Capa | Tech |
|---|---|
| Cliente | Vite 7 + React 18 + TypeScript 5 + Tailwind CSS 3.4 + PWA (vite-plugin-pwa) |
| Server | Node 20+ + Express 4 + TypeScript 5 + Drizzle ORM |
| DB | PostgreSQL 16 + pgvector (Ola 5) |
| Auth | better-auth (email/pass + sessions) |
| State (cliente) | Zustand |
| Local DB (cliente) | Dexie (IndexedDB) |
| AI | DeepSeek V3/R1/V4 vía SDK `openai` (OpenAI-compatible) |
| Package manager | **npm workspaces** (recomendado pnpm para producción) |
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
├── scripts/          # Mirror + parse + embed
├── .github/          # CI
└── docker-compose.yml # Postgres para dev
```

---

## Setup local

### Pre-requisitos
- Node.js 20 o 22 (recomendado 22)
- npm 10+ (incluido con Node 22)
- Docker (para Postgres local) o un Postgres accesible

### Instalación

```bash
# Clonar
git clone https://github.com/JuanoLemos/dobleuno.git
cd dobleuno

# Instalar deps del monorepo
npm install

# Levantar Postgres (dev)
npm run db:up
# Espera ~5s a que esté healthy
```

### Configurar .env

```bash
# Server
cp apps/server/.env.example apps/server/.env
# Editar apps/server/.env:
#   DATABASE_URL=postgres://dobleuno:dobleuno_dev@localhost:5432/dobleuno
#   DEEPSEEK_API_KEY=sk-...

# Web
cp apps/web/.env.example apps/web/.env
# Editar apps/web/.env:
#   VITE_API_URL=http://localhost:3000
```

### Migrar DB (cuando aplique)

```bash
npm run db:migrate
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
| `npm test` | Corre tests de todos los workspaces |
| `npm run test:web` | Tests del cliente |
| `npm run test:server` | Tests del server |
| `npm run lint` | ESLint en todo el monorepo (max-warnings=0) |
| `npm run typecheck` | TypeScript en todos los workspaces |
| `npm run format` | Prettier write |
| `npm run db:up` | Levanta Postgres en Docker |
| `npm run db:down` | Apaga Postgres |
| `npm run db:migrate` | Aplica migraciones de Drizzle |

---

## Brand

Inspirado en pergamino medieval y fragua oscura. Ver `docs/SOURCES.md` y el portal v0 en `../portal-dobleuno.html`.

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

---

## Roadmap

| Ola | Qué | Estado |
|---|---|---|
| 0 | Decisiones + plan | ✅ |
| 0.5 | Prompt v1 con DeepSeek | ✅ |
| 1 | Foundation (monorepo, PWA, auth) | 🟡 en curso |
| 2 | KB local + mirror de tow.whfb.app | ⏳ |
| 3 | List builder con validación | ⏳ |
| 4 | Battle tracker | ⏳ |
| 5 | Rules oracle con RAG (FAQs + KB + LLM) | ⏳ |
| 6 | Polish + deploy (Hetzner + Cloudflare) | ⏳ |

Ver `docs/plan/PLAN-OLEADAS.md` para detalle por ola.

---

## License

CC BY 4.0 — ver `LICENSE.md`.
Atribución a `tow.whfb.app` para el contenido de reglas — ver `docs/SOURCES.md`.
