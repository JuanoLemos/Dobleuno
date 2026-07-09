# Sistema Dobleuno

> Documento vivo de arquitectura. Última: 2026-07-08 (Ola 1).

## Vista general

Dobleuno es un sistema cliente-servidor para asistir a un jugador de Warhammer: The Old World durante una partida en mesa. El cliente es una PWA mobile-first; el server es un backend Node con BD relacional + vector store + LLM.

## Diagrama de componentes

```
┌──────────────────────────┐                ┌─────────────────────────────┐
│ Cliente PWA (mobile)     │                │ Server (Node 20+)           │
│ Vite + React 18 + TS     │                │ Express 4 + TypeScript 5     │
│ Tailwind 3.4 · PWA       │                │                             │
│ Zustand · Dexie          │  HTTPS REST   │ /api/auth     (better-auth) │
│ React Router 6           │ ─────────────► │ /api/health   (GET)         │
│                          │                │ /api/lists    (CRUD, Ola 3) │
│ Service Worker           │                │ /api/battles  (CRUD, Ola 4) │
│ (offline-first)          │                │ /api/rules    (search,Ola 2)│
└──────────────────────────┘                │ /api/ask      (RAG,  Ola 5) │
                                           │                             │
                                           │ ┌──────────────────────┐   │
                                           │ │ PostgreSQL 16        │   │
                                           │ │ + pgvector (Ola 5)   │   │
                                           │ │                      │   │
                                           │ │ users · sessions     │   │
                                           │ │ lists · battles      │   │
                                           │ │ kb · faqs            │   │
                                           │ │ embeddings           │   │
                                           │ └──────────────────────┘   │
                                           │                             │
                                           │ ┌──────────────────────┐   │
                                           │ │ mirror-tow (cron)    │   │
                                           │ │ diario 03:00 UTC     │   │
                                           │ │ → KB + embeddings    │   │
                                           │ └──────────────────────┘   │
                                           │                             │
                                           │ ┌──────────────────────┐   │
                                           │ │ DeepSeek client      │──►│ DeepSeek API
                                           │ │ (SDK openai)         │   │ (chat + embed OAI)
                                           │ └──────────────────────┘   │
                                           └─────────────────────────────┘
```

## Capas del cliente

| Capa | Tech | Por qué |
|---|---|---|
| Build | Vite 7 | Hot reload rápido, PWA plugin maduro |
| UI | React 18 + TS 5 | Ecosistema maduro, type-safe |
| Estilos | Tailwind 3.4 | Mobile-first, utility-first, paleta custom |
| Routing | React Router 6 | Data router con loaders |
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
| Runtime | Node 20+ | LTS, estable |
| Framework | Express 4 | Conocido, sin riesgo |
| Lenguaje | TypeScript 5 | Mismo stack que cliente |
| ORM | Drizzle | Type-safe, SQL-first, ideal con pgvector |
| DB | PostgreSQL 16 | Relacional maduro, pgvector integrado |
| Auth | better-auth | Email/pass + verification + reset out-of-box |
| Embeddings | OpenAI `text-embedding-3-small` | Barato, suficiente calidad |
| LLM | DeepSeek V3/R1/V4 (vía SDK openai) | ~20-30x más barato que Claude, OpenAI-compatible |
| Validación | Zod | Mismo que cliente, tipos compartidos |
| Testing | Vitest | Mismo que cliente |

## Decisiones arquitectónicas cerradas (ADRs)

- ADR-001: monorepo (npm workspaces, recomendación futura pnpm)
- ADR-002: fuente de reglas es `tow.whfb.app` (revive, acepta)
- ADR-003: backend + LLM (revive, acepta — ahora con DeepSeek)
- ADR-004: hosting Hetzner VPS (pendiente aceptar formalmente)
- ADR-005: LLM provider (DeepSeek + OpenAI embeddings)

## Principios

1. **Cliente offline-first** para Listas, Batalla, Reglas. La IA requiere red.
2. **Server stateless** salvo Postgres. Sesiones JWT, sin estado en memoria.
3. **Tiered response** para el oráculo (FAQs → KB → LLM) — ver `docs/qa/prompt-v0.1-results.md`.
4. **Brand consistency**: paleta forge/blood/bronze en la app, parchment en el portal.
5. **Mobile-first**: 360px de ancho mínimo, touch targets ≥ 44px, bottom nav.

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
