# Dobleuno — Plan de Ejecución

> Documento vivo. Se actualiza al cerrar cada ola.

| | |
|---|---|
| **Proyecto** | Dobleuno (companion app de mesa para Warhammer: The Old World) |
| **Estado** | Ola 0 — Decisiones y plan |
| **Última actualización** | 2026-07-08 |
| **Owner** | Juano · **Agente** Mavis (M3 thinking) |
| **Workspace** | `C:\Users\jlemo\OneDrive\Desktop\OldWorld` |

---

## 1. TL;DR

Dobleuno es la app de mesa para un jugador de TOW. Se usa en el celular, en la mesa, mientras se juega. Tres pantallas: **Listas** (armar y validar ejército), **Batalla** (tracker de la partida en vivo), **Reglas** (buscador offline + oráculo IA). Sin comunidad, sin marketplace, sin AR, sin narradores novelescos. Solo asistencia + stats + un poquito de magia.

Stack: monorepo **pnpm**, cliente **Vite + React 18 + TS + Tailwind** (PWA instalable en iOS/Android), server **Node + Express + Postgres + pgvector**, AI via **RAG sobre tow.whfb.app** + LLM API. Hosting: **Hetzner VPS + Docker** (server) + **Cloudflare Pages** (cliente). Brand: pergamino para portal, fragua para app.

Timeline MVP: **4-5 semanas** (6 olas, una por semana, demo al final de cada una).

---

## 2. Scope

### ✅ En el MVP (Olas 1-6, 4-5 semanas)

1. **Auth + sync** del usuario: email/pass, sync de listas y partidas entre sus devices
2. **List builder** mobile-first con validación de composición TOW
3. **Battle tracker** end-to-end: deployment → 6 fases → post-game
4. **KB local** de reglas con búsqueda offline (mirror de tow.whfb.app)
5. **Rules oracle** con RAG (preguntás en lenguaje natural, responde con cita)
6. **Combat calculator** (save stacks, expected outcomes, probabilidades)
7. **Phase helpers** (movement, magic, dispel, psychology)
8. **Historial de partidas** del usuario
9. **Stats básicas** por batalla y agregadas
10. **Facciones MVP**: Empire + Bretonia (las 2 cubren arquetipos distintos)
11. **Prompt del AI** versionado y editable

### ❌ Fuera del MVP (Fase 2+)

- Marketplace, comunidad, foros, leaderboards públicos
- AR tabletop, voice integration
- Narrador novelesco, coach moral
- Integración con BCW/Warscape
- House rules packs compartibles
- Torneos oficiales con auto-pairings
- iOS/Android nativo (la PWA instala nativo, alcanza)
- Más de 2 facciones (Dwarfs, Orcs, Skaven, etc. → Fase 2)

### 🟡 Diferido (a discutir más adelante)

- **Branding detallado** (logo, copy, micro-interacciones) — el portal v0 es referencia, no la versión final
- **Onboarding** — el primer login, el "qué es Dobleuno", el tutorial
- **Sharing de listas** entre usuarios (es post-MVP pero merece Ola propia)
- **Sincronización en tiempo real** de batalla entre los 2 jugadores (es post-MVP, hoy cada uno trackea el suyo)

---

## 3. Stack

### Cliente (PWA mobile-first)

| Capa | Elección | Por qué |
|---|---|---|
| Build | **Vite 7** | Estándar moderno, hot reload rápido, integración con PWA nativa |
| Framework | **React 18** | Ecosistema maduro, lo más hireable, type-safe con TS |
| Lenguaje | **TypeScript 5** | No hay vuelta: tipos para un proyecto de este tamaño |
| Estilos | **Tailwind CSS 4** | Mobile-first por default, utility-first, sin discutir CSS-in-JS |
| Routing | **React Router 6** | Estándar |
| Estado | **Zustand** | Más liviano que Redux, perfecto para single-user |
| Local DB | **Dexie.js** (IndexedDB) | Offline-first, queries, schema migrations |
| Forms | **React Hook Form + Zod** | Estándar moderno, type-safe |
| PWA | **vite-plugin-pwa + Workbox** | Service worker, precaching, manifest |
| i18n | **react-intl** | es-AR por default, en fallback, listo para sumar más |
| HTTP | **fetch + wrapper fino** | Sin axios, sin nada raro |
| Testing | **Vitest + Testing Library** | Rápido, mismo ecosistema |
| Lint | **ESLint + Prettier** | Estándar |
| Package mgr | **pnpm 9** | Rápido, monorepo nativo, ahorra disco |

### Server (Node + Express)

| Capa | Elección | Por qué |
|---|---|---|
| Runtime | **Node 20 LTS** | Estable hasta 2026, performance OK |
| Framework | **Express 4** | Conocido, simple, suficiente para MVP |
| Lenguaje | **TypeScript 5** | Mismo stack que cliente, tipos compartidos |
| DB | **PostgreSQL 16** | Relacional maduro, pgvector integrado |
| ORM | **Drizzle ORM** | Type-safe, liviano, SQL-first (vs Prisma que es más opaco) |
| Auth | **Lucia** (o custom JWT) | Lucia es moderno, sin vendor lock-in |
| Vector store | **pgvector** | Empotrado en Postgres, suficiente para 1 usuario |
| Embeddings | **OpenAI `text-embedding-3-small`** | Barato, suficiente calidad, $0.02 / 1M tokens |
| LLM | **Anthropic Claude 3.5 Sonnet** (o GPT-4o-mini) | Buena calidad, RAG, costo razonable. Configurable |
| Mirror | **node-cron + script TS** | Job diario/semanal contra tow.whfb.app |
| Validación | **Zod** | Mismo que el cliente, tipos compartidos |
| Testing | **Vitest** | Mismo que cliente |
| Lint | **ESLint + Prettier** | Mismo que cliente |

### Hosting

| Capa | Elección | Por qué | Costo |
|---|---|---|---|
| Server | **Hetzner VPS (CX22) + Docker Compose** | Barato, simple, EU/US, control total | ~€5/mes |
| Cliente | **Cloudflare Pages** | Edge, free tier generoso, ideal para PWA | $0 |
| DB | **Postgres en el mismo VPS** (Docker) | Para 1 usuario sobra | incluido |
| Backups | **Snapshot semanal del VPS** (Hetzner) | 1 usuario, no hace falta más complejo | incluido |
| Dominio | **dobleuno.app** o similar (a definir) | Custom domain en Cloudflare Pages | ~$10/año |

### Lo que NO usamos y por qué

- **No** React Native / Expo → la PWA instala nativo, es más simple, mismo codebase
- **No** Next.js → no necesitamos SSR para esto, Vite + React es suficiente
- **No** Prisma → Drizzle es más SQL-first, mejor para pgvector
- **No** MongoDB → relacional es lo correcto, embeddings en pgvector
- **No** Firebase/Supabase → el server propio es parte del producto
- **No** Redux Toolkit → Zustand es más liviano, suficiente para nuestro scope
- **No** Apollo/GraphQL → REST con Zod-validated payloads alcanza

---

## 4. Arquitectura (alto nivel)

```
┌─────────────────────────┐                ┌──────────────────────────────┐
│   Cliente PWA (mobile)  │                │   Server (Hetzner VPS)       │
│   ────────────────────  │                │   ────────────────────────  │
│   Vite + React + TS     │                │   Express + TypeScript       │
│   Tailwind · PWA        │                │                              │
│   Zustand · Dexie       │   HTTPS REST   │   /api/auth      (better-auth)│
│   Dexie (IndexedDB)     │ ─────────────► │   /api/lists     (CRUD)      │
│   vite-plugin-pwa       │                │   /api/battles   (CRUD)      │
│                         │                │   /api/rules     (search)    │
│   Service Worker        │                │   /api/ask       (RAG+LLM)   │
│   (offline-first)       │                │                              │
└─────────────────────────┘                │   ┌────────────────────┐    │
                                           │   │ PostgreSQL + pgvec │    │
                                           │   │ users · lists ·    │    │
                                           │   │ battles · kb ·     │    │
                                           │   │ embeddings         │    │
                                           │   └────────────────────┘    │
                                           │                              │
                                           │   ┌────────────────────┐    │
                                           │   │ mirror-tow (cron)  │    │
                                           │   │ daily 03:00 UTC    │    │
                                           │   │ → kb + embeddings  │    │
                                           │   └────────────────────┘    │
                                           │                              │
                                           │   ┌────────────────────┐    │
                                           │   │ LLM provider       │────┼──► DeepSeek API
                                           │   │ (configurable)     │    │   (OpenAI-compatible)
                                           │   └────────────────────┘    │
                                           └──────────────────────────────┘

   Datos del usuario:    KB de reglas:
   - lists               - units (Empire, Bretonia)
   - battles             - weapons · magic items
   - profile             - special rules · scenarios
                         - embeddings (pgvector)
```

**Principios:**
- El cliente es **offline-first** para Listas, Batalla, Reglas (KB cacheada). La IA requiere red.
- El server es **stateless** salvo por Postgres. Sin sesiones en memoria, todo JWT.
- La KB se re-mirrea en background. El cliente siempre lee la BD del server (no la suya).
- Listas y batallas se persisten en el server (para sync entre devices) pero se cachean local en Dexie para offline.

---

## 5. Estructura del repo

Monorepo pnpm. Cliente y server comparten tipos en `packages/shared`.

```
Dobleuno/
├── apps/
│   ├── web/                          # Cliente PWA
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   ├── icons/                # PWA icons (192, 512, maskable)
│   │   │   └── og-image.png
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/
│   │   │   │   ├── Listas.tsx
│   │   │   │   ├── Batalla.tsx
│   │   │   │   ├── Reglas.tsx
│   │   │   │   └── auth/             # login, register, reset
│   │   │   ├── components/
│   │   │   │   ├── ui/               # primitives (button, input, modal)
│   │   │   │   ├── lists/            # FactionPicker, UnitCard, etc.
│   │   │   │   ├── battle/           # UnitState, PhaseBar, CombatResolver
│   │   │   │   └── oracle/           # AskBox, CitationList
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # fetch wrapper
│   │   │   │   ├── dexie.ts          # IndexedDB schema
│   │   │   │   ├── store.ts          # Zustand stores
│   │   │   │   └── combat.ts         # probability math (pure)
│   │   │   ├── styles/
│   │   │   │   └── tailwind.css
│   │   │   └── i18n/
│   │   │       ├── es-AR.json
│   │   │       └── en.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                       # Server Node + Express
│       ├── src/
│       │   ├── index.ts              # bootstrap
│       │   ├── app.ts                # Express app
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── lists.ts
│       │   │   ├── battles.ts
│       │   │   ├── rules.ts          # /api/rules/search
│       │   │   └── ask.ts            # /api/ask (RAG)
│       │   ├── db/
│       │   │   ├── schema.ts         # Drizzle schema
│       │   │   ├── migrations/
│       │   │   └── client.ts
│       │   ├── lib/
│       │   │   ├── auth.ts           # Lucia setup
│       │   │   ├── rag.ts            # embed + retrieve + prompt
│       │   │   ├── llm.ts            # Anthropic client
│       │   │   └── validate.ts       # Zod helpers
│       │   ├── jobs/
│       │   │   └── mirror-tow.ts     # cron job
│       │   └── prompts/
│       │       └── system.ts         # Dobleuno system prompt
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                       # Tipos compartidos
│       ├── src/
│       │   ├── types/
│       │   │   ├── list.ts           # Army, Unit, MagicItem
│       │   │   ├── battle.ts         # GameState, UnitState, Phase
│       │   │   ├── rules.ts          # Rule, SpecialRule, Weapon
│       │   │   └── user.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── data/                             # Mirror de tow.whfb.app (gitignored)
│   ├── raw/                          # HTML scrapeado
│   └── processed/                    # JSON parseado
│
├── scripts/
│   ├── mirror-tow.ts                 # orquestador del mirror
│   ├── parse-army.ts                 # HTML → JSON
│   └── embed-rules.ts                # JSON → embeddings
│
├── docs/
│   ├── ROADMAP.md                    # roadmap vivo
│   ├── CHECKLIST.md
│   ├── CHANGELOG.md
│   ├── plan/                         # este doc vive acá
│   │   └── PLAN.md                   # ← este archivo
│   ├── arch/
│   │   ├── ADR-001-monorepo-pnpm.md
│   │   ├── ADR-002-fuente-tow-whfb.md
│   │   ├── ADR-003-backend-llm.md
│   │   ├── ADR-004-hosting-hetzner.md
│   │   ├── ADR-005-llm-provider.md
│   │   └── SISTEMA.md
│   ├── guias/
│   │   ├── setup-dev.md
│   │   └── deploy.md
│   ├── mecanicas/
│   │   ├── MECANICA-COMPOSICION.md   # reglas de composición TOW
│   │   ├── MECANICA-COMBATE.md       # resolución de combate
│   │   └── MECANICA-MAGIA.md         # fase de magia
│   └── DILIGENCIA.md
│
├── portal-dobleuno.html              # portal de marca v0 (defer)
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .gitignore
├── .editorconfig
├── .nvmrc                            # node 20
├── package.json                      # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.mjs
├── prettier.config.mjs
├── README.md
└── LICENSE                           # CC BY 4.0 (mantenemos del fork)
```

---

## 6. Plan de olas

| # | Ola | Días | Qué se construye | Verificación |
|---|---|---|---|---|
| 0 | **Decisiones** | hoy | Cerrar plan, ADRs, facciones, hosting, LLM provider | Este doc aprobado |
| 0.5 | **Prompt v1** | +1-2 | System prompt del AI iterado, ADR-005 cerrado | Prompt listo + tests de regresión |
| 1 | **Foundation** | 1-5 | Monorepo, scaffold cliente + server, PWA, Dexie, auth UI, dark mode brand | Dev server corre, PWA instala en mobile, 3 tabs routean, login mock funciona |
| 2 | **KB local** | 6-10 | Mirror tow.whfb.app, parser HTML→JSON, ingestión Empire+Bretonia, búsqueda offline | Buscar "great weapon" devuelve Greatsword + regla, todo offline |
| 3 | **List builder** | 11-17 | Picker de facción, validación composición, magic items, save/load + sync, export | Armar lista Empire 2000 pts, validar, guardar, recargar, exportar |
| 4 | **Battle tracker** | 18-25 | Setup, 6 fases, unit state, combat resolver, magic helper, save/load + sync, post-game | Jugar Empire vs Bretonia completa, save, reload, ver stats |
| 5 | **Rules oracle** | 26-30 | Embeddings + RAG + /api/ask + UI en Reglas y Batalla | Pregunta sobre carga devuelve respuesta con cita, sin inventar |
| 6 | **Polish + deploy** | 31-35 | Lighthouse mobile, offline-first, deploy cliente (Cloudflare) + server (Hetzner), README | PWA instala en iOS+Android, funciona offline, URLs públicas, < 3s TTFB |
| 7+ | **Fase 2** | +3-4 sem | Historial, stats agregadas, charts, asesor post-partida, +2-3 facciones | 20 partidas en historial con stats reales |

**Entregables por ola:**
- Branch temático (`ola-1-foundation`, `ola-2-kb`, etc.)
- Demo al final (link local + screenshots mobile + diff)
- ADRs actualizados
- CHANGELOG bumped
- Checklist de la ola en cero

---

## 7. Decisiones pendientes (necesito tu input)

| # | Pregunta | Mi recomendación | Bloquea |
|---|---|---|---|
| D1 | ¿Mantenemos el proyecto en `OldWorld/Dobleuno/` o lo movemos a otro lado? | `OldWorld/Dobleuno/` (al lado de `.legacy/`) | Ola 1 |
| D2 | Hosting server: ¿Hetzner VPS o Railway? | **Hetzner** (más barato, control total, vos ya tenés Hetzner?) | Ola 6 |
| D3 | LLM provider: ¿Anthropic Claude, OpenAI, o self-hosted? | **Anthropic Claude 3.5 Sonnet** (mejor RAG, costo OK, configurable) | Ola 5 |
| D4 | Dominio: ¿`dobleuno.app`, `dobleuno.ar`, `dobleuno.dev`? | `dobleuno.app` si está libre, sino `.dev` | Ola 6 |
| D5 | ¿Conservamos la metodología Diligencia (ROADMAP.md, CHECKLIST.md, etc.)? | **Sí**, ya la tenés y funciona. La adaptamos al nuevo stack | Ola 1 |
| D6 | ¿El proyecto se queda en GitHub (JuanoLemos/old-world-builder) o repo nuevo? | **Repo nuevo** `JuanoLemos/dobleuno` (fork queda como referencia) | Ola 1 |
| D7 | ¿Conservamos la licencia CC BY 4.0 del fork? | **Sí**, pero agregamos attribution a tow.whfb.app en `docs/SOURCES.md` | Ola 1 |
| D8 | ¿Querés que el portal `portal-dobleuno.html` se haga deploy aparte (ej. Cloudflare Pages) o queda local? | **Local por ahora**, deploy aparte si crece | Post-MVP |
| D9 | ¿Cómo te enterás del progreso entre olas? | Yo te tiro demo al final + vos jugás en mesa y me das feedback | — |

---

## 8. Archivos críticos que se crean en Ola 0 → 1

| Archivo | Cuándo | Qué tiene |
|---|---|---|
| `docs/plan/PLAN.md` | Ola 0 (este doc) | Este archivo, versionado |
| `docs/arch/ADR-001-monorepo-pnpm.md` | Ola 0 | Por qué monorepo + pnpm |
| `docs/arch/ADR-002-fuente-tow-whfb.md` | Ola 0 | tow.whfb.app como fuente + attribution |
| `docs/arch/ADR-003-backend-llm.md` | Ola 0 (revive) | Acepta el ADR existente, actualiza contexto |
| `docs/arch/ADR-004-hosting-hetzner.md` | Ola 0 | Stack de deploy |
| `docs/arch/ADR-005-llm-provider.md` | Ola 0.5 | Anthropic vs OpenAI |
| `apps/server/src/prompts/system.ts` | Ola 0.5 | System prompt v1 |
| `package.json` (root) | Ola 1 | pnpm workspace root, scripts |
| `pnpm-workspace.yaml` | Ola 1 | define apps/ y packages/ |
| `apps/web/` | Ola 1 | scaffold Vite + React + TS + Tailwind + PWA |
| `apps/server/` | Ola 1 | scaffold Express + TS + Drizzle |
| `packages/shared/` | Ola 1 | tipos compartidos |
| `docs/ROADMAP.md` | Ola 1 | versión renovada para Dobleuno |
| `README.md` | Ola 1 | pitch + setup + deploy |

---

## 9. Verificación por ola (criterios de "done")

| Ola | Done = |
|---|---|
| 0 | Este PLAN.md aprobado por vos. ADRs 001-004 en `Proposed`. Sin código todavía. |
| 0.5 | Prompt v1 en `apps/server/src/prompts/system.ts`. ADR-005 cerrado. Test con 5 preguntas reales. |
| 1 | `pnpm dev` levanta cliente y server. Cliente instala como PWA en iOS Safari. Dark mode con los colores de marca. Login mock funciona. CI pasa lint + test + build. |
| 2 | Búsqueda offline de "great weapon", "magic weapon", "d3 wounds" devuelve resultados de Empire + Bretonia. Sin red, sigue funcionando. |
| 3 | Una lista de Empire 2000 pts se arma, valida, guarda, recarga y exporta. Validación atrapa violaciones de composición. |
| 4 | Una batalla Empire vs Bretonia se juega de punta a punta. Save, reload, post-game muestra stats correctas. |
| 5 | Una pregunta libre (ej: "¿puedo declarar carga a través de un bosque?") devuelve respuesta con cita a tow.whfb.app. Pregunta fuera de TOW se rechaza. |
| 6 | Lighthouse mobile ≥ 90 en performance. PWA instala en iOS Safari Y Chrome Android. Funciona 100% offline después de primer load. URL pública accesible. |
| 7+ | 20 partidas con stats reales visibles. Asesor post-partida da 2-3 insights útiles. |

---

## 10. Próximo paso (lo que hago cuando me das OK)

1. **Cierro Ola 0** creando `docs/arch/ADR-001`, `ADR-002` (revive), `ADR-003` (revive), `ADR-004`. Marco este PLAN como **Aprobado**.
2. **Arranco Ola 0.5** (Prompt v1) si me confirmás D3 (LLM provider). Si no, espero.
3. **Arranco Ola 1** (Foundation) que es la más larga: scaffold monorepo, cliente, server, auth UI, PWA, dark mode. ~5 días. Demo al final con un `pnpm dev` corriendo y vos instalando la PWA en tu celu.

---

## 11. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| tow.whfb.app cambia estructura HTML y rompe el parser | Media | Alto | Parser con tests contra snapshots, alertas cuando falla el mirror, fallback a versión anterior |
| LLM alucina reglas y mete la pata en la mesa | Alta | Alto (UX) | Prompt estricto con "no inventar reglas", citations obligatorias, validación de cita contra KB antes de devolver |
| El server se queda corto para embeddings | Baja | Medio | pgvector es eficiente, OpenAI embeddings son baratos. Si crece, swap a Qdrant es 1 sprint |
| El usuario se frustra con el onboarding | Media | Medio | Wizard corto en Ola 6, "tomá una lista de ejemplo" como default |
| El mobile-first en iOS Safari rompe algo del PWA | Media | Medio | Testear en iOS Safari desde Ola 1, no al final. Service worker estricto |
| El proyecto se vuelve pesado y se atrasa | Media | Alto | Olas con scope fijo. Si una ola se pasa, se negocia la siguiente. No heroísmo. |
| El usuario (vos) quiere cambiar de idea a mitad de Ola 1 | — | — | OK, se recalcula. La estructura monorepo lo hace barato. |

---

## 12. Lo que NO está en este plan (a propósito)

- No hay fechas absolutas (calendario). Son olas por semanas, vos me decís cuándo arrancás.
- No hay team multi-agente. Yo (M3) codeo, vos jugás y revisás.
- No hay marketing post-MVP. El deploy es para vos, no para usuarios externos.
- No hay analytics de uso. Es tu app, tu server, tu data.

---

*Versión: 0.1 · Estado: Proposed → Aprobado cuando me digas "OK, dale"*
