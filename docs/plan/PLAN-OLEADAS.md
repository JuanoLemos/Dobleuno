# Dobleuno — Plan de Olas (Ola 0.5 → MVP)

> Brief de ejecución. Decisiones locked, archivos a crear, criterios de "done" por ola. Este doc **no se reabre** salvo crisis. Las dudas que aparezcan durante la ejecución se resuelven en el momento, no se reabre el plan.

| | |
|---|---|
| **Proyecto** | Dobleuno |
| **Documento** | Brief de ejecución por olas |
| **Estado** | Aprobado para ejecución (2026-07-08) |
| **Decisiones locked** | 14 decisiones D1-D14, todas resueltas en este doc |
| **Total olas hasta MVP** | 7 (0.5 + 1 + 2 + 3 + 4 + 5 + 6) |
| **Total días estimados** | 30-35 días hábiles |
| **Workspace** | `OldWorld/Dobleuno/` |

---

## 0. Decisiones locked (D1–D14, no se reabren)

| # | Decisión | Valor | Justificación |
|---|---|---|---|
| D1 | Ubicación | `OldWorld/Dobleuno/` | Al lado de `.legacy/`, separado, fácil de mover |
| D2 | Hosting server | **Hetzner CX22** + Docker Compose | €5/mes, control total, EU, ideal para Postgres+pgvector |
| D3 | LLM provider | **DeepSeek V3 / R1 / V4** (vía SDK openai) | ~20-30x más barato que Claude, OpenAI-compatible, calidad suficiente |
| D4 | Dominio | `dobleuno.app` (fallback: `dobleuno.dev`) | .app fuerza HTTPS, memorable |
| D5 | Metodología docs | **Diligencia** (ROADMAP.md, CHECKLIST.md, CHANGELOG.md, doc/arch/, doc/guias/, doc/mecanicas/) | Ya la tenés, funciona |
| D6 | Repo | **Repo nuevo `JuanoLemos/dobleuno`** | Fork queda como referencia histórica |
| D7 | Licencia | **CC BY 4.0** + attribution a `tow.whfb.app` en `docs/SOURCES.md` | Mantenemos del fork, agregamos fuente |
| D8 | Portal HTML | Local por ahora | Deploy aparte si crece (post-MVP) |
| D9 | Updates entre olas | Demo al final + vos jugás en mesa y das feedback | — |
| D10 | React | **18.3** (última 18.x estable) | 19 todavía verde para producción, ecosistema 18 estable |
| D11 | Tailwind | **3.4** | v4 todavía estabilizando motor Oxide, v3 es lo seguro |
| D12 | Auth | **better-auth** + Drizzle adapter | Email/pass + verification + reset out of the box, type-safe, activo |
| D13 | PWA icons | **Generados desde SVG del sigilo con script Node** (`apps/web/scripts/generate-icons.mjs`) | Sin dependencia externa, reproducible |
| D14 | Linting | **TS strict + ESLint max-warnings + Prettier** | Te ahorra bugs en mesa |

### Decisiones que NO consulto (tomo yo, las listo para auditoría)

- Express 4 sobre Fastify (más conocido, sin riesgo)
- Drizzle ORM sobre Prisma (SQL-first, mejor con pgvector)
- Vitest + Testing Library (estándar Vite)
- ESLint flat config (estándar 2025)
- Prettier 3 (estándar)
- node-cron para mirror (simple, suficiente)
- Zod compartido cliente+server (un solo schema)
- GitHub Actions para CI (free, ya tenés GitHub)
- bcryptjs (pure JS, sin native build)
- Cheerio para parser HTML (estándar)
- OpenAI `text-embedding-3-small` para embeddings ($0.02/1M tokens)
- Sin Sentry/PostHog en MVP (los agregamos en Fase 2)
- Sin OpenAPI en MVP (los tipos compartidos son la doc)
- Sin monitoring externo en MVP (logs a stdout, agregamos Fase 2)
- Sin rate limiting externo en MVP (better-auth tiene rate limit nativo)

### Diferidas (te pregunto cuando lleguemos)

- Backups automatizados → Ola 6
- Sentry / error tracking → Fase 2
- Monitoring / Grafana → Fase 2
- OpenAPI / Swagger → Ola 5
- Dominio custom vs `pages.dev` → Ola 6

---

## 1. Ola 0.5 — Prompt v1 (1-2 días)

### Goal
Tener el system prompt del AI listo, con tests de regresión, antes de construir nada del cliente.

### Scope
**In:** prompt versionado en TS, 5-10 preguntas de prueba, ADR-005 cerrado.
**Out:** endpoint de ask (eso es Ola 5), embeddings, RAG completo.

### Archivos

| Path | Qué tiene |
|---|---|
| `apps/server/src/prompts/system.ts` | El prompt en TS, exportado, con `PROMPT_VERSION = '0.1'` |
| `apps/server/src/prompts/__tests__/system.test.ts` | 10 preguntas de prueba (Vitest) |
| `apps/server/src/prompts/fixtures/questions.json` | Set de preguntas canónicas |
| `apps/server/src/prompts/fixtures/expected-answers.json` | Respuestas esperadas (citas) |
| `docs/arch/ADR-005-llm-provider.md` | Aceptado, justifica DeepSeek |
| `docs/mecanicas/MECANICA-COMPOSICION.md` | Reglas de composición TOW codificadas (referencia para el AI) |
| `docs/mecanicas/MECANICA-COMBATE.md` | Resolución de combate TOW (referencia) |
| `docs/mecanicas/MECANICA-MAGIA.md` | Fase de magia TOW (referencia) |

### Decisiones locked
- **Modelo:** `claude-3-5-sonnet-20241022` (o el más nuevo Sonnet disponible en la fecha de ejecución). Si está Sonnet 4 disponible, ese.
- **Temperature:** `0.3` (baja creatividad, alta precisión).
- **Max tokens:** `1500` (suficiente para respuesta + 2-3 citas).
- **Top-p:** `0.9` (default).
- **Stop sequences:** ninguna.
- **System prompt:** el que entregué en el chat de planeación, refinado con las mecánicas de TOW.
- **Format:** texto plano (no JSON mode en MVP, las citas las parseamos con regex).
- **Validation post-respuesta:** la respuesta debe contener al menos 1 cita con formato `Fuente: ...`. Si no la tiene, descartar y responder "no tengo esa regla".

### Acceptance
- 10 preguntas de prueba pasan:
  1. Carga legal a través de bosque → cita "Movement in detail" + "Cover"
  2. Greatsword vs Bretonnian Knight con ward save → cita "Armour Saves" + "Ward Saves"
  3. Dispel con +2 por lore matching → cita "Dispel"
  4. Capitán de Infantería +A por filas → cita "Capitanes" + FAQ 2025-04
  5. ¿Cómo funciona el overwatch en 40K? → "Solo ayudo con TOW"
  6. ¿El Steam Tank cuenta como war machine? → "No tengo esa regla registrada"
  7. Panic test por aliado que huye a 8" → cita "Psychology"
  8. Reformar infantería de 25 después de carga perdedora → cita "Reform"
  9. Charge range 14" para caballería → cita "Troop types"
  10. Magic item rarity 2 raros en mismo personaje → cita "Magic Items"
- Latencia: < 3s (mediana sobre las 10).
- Cero alucinaciones detectadas (todas las respuestas tienen cita válida).

### Demo
- Script Node que corre las 10 preguntas contra DeepSeek API y muestra respuestas.
- Output: `docs/qa/prompt-v0.1-results.md` con cada pregunta, respuesta, y verdict (pass/fail).

### Riesgos
- DeepSeek API no disponible / rate limit → fallback a `deepseek-reasoner` u otro modelo del mismo vendor.
- Costo inesperado → monitoreo de tokens consumidos.

---

## 2. Ola 1 — Foundation (5 días)

### Goal
Monorepo funcionando, dev server, PWA installable, auth básico con better-auth, dark mode de marca. Al final: instalo la PWA en mi celu y la abro.

### Scope
**In:** scaffold monorepo, cliente PWA, server con auth, dark mode, CI, docs base.
**Out:** KB de reglas, list builder, battle tracker, AI, deploy.

### Archivos (~50)

**Raíz `Dobleuno/`:**
```
package.json                   # workspace root, scripts pnpm
pnpm-workspace.yaml            # define apps/ + packages/
tsconfig.base.json             # strict: true, target ES2022
eslint.config.mjs              # flat config
prettier.config.mjs
.gitignore
.editorconfig
.nvmrc                         # node 20
README.md                      # pitch + setup
LICENSE                        # CC BY 4.0
```

**Cliente `apps/web/`:**
```
index.html
vite.config.ts                 # vite-plugin-pwa, alias @/
tailwind.config.ts             # paleta forge/blood/bronze/parchment
tsconfig.json
package.json
.env.example
src/main.tsx
src/App.tsx                    # React Router con data router
src/routes/Index.tsx           # redirect a /listas
src/routes/Listas.tsx          # placeholder
src/routes/Batalla.tsx         # placeholder
src/routes/Reglas.tsx          # placeholder
src/routes/auth/Login.tsx
src/routes/auth/Register.tsx
src/routes/auth/VerifyEmail.tsx
src/routes/auth/ForgotPassword.tsx
src/components/ui/Button.tsx
src/components/ui/Input.tsx
src/components/ui/Card.tsx
src/components/ui/Modal.tsx
src/components/ui/Tabs.tsx
src/components/ui/Toast.tsx
src/components/layout/AppShell.tsx
src/components/layout/BottomNav.tsx
src/components/layout/TopBar.tsx
src/components/auth/AuthForm.tsx
src/lib/api.ts                 # fetch wrapper, base URL
src/lib/auth-client.ts         # better-auth client
src/lib/dexie.ts               # schema inicial vacío
src/lib/store.ts               # Zustand (auth slice)
src/lib/cn.ts                  # clsx + tailwind-merge
src/lib/env.ts                 # Zod env validation
src/styles/tailwind.css
src/i18n/es-AR.json
src/i18n/en.json
src/i18n/index.ts
public/manifest.webmanifest
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-maskable.png
public/icons/apple-touch-icon.png
scripts/generate-icons.mjs     # lee SVG del sigilo, genera PNG
```

**Server `apps/server/`:**
```
package.json
tsconfig.json
drizzle.config.ts
.env.example
Dockerfile
src/index.ts                   # bootstrap, listen
src/app.ts                     # Express app
src/env.ts                     # Zod env
src/routes/auth.ts             # better-auth handler
src/routes/health.ts           # GET /api/health
src/db/client.ts               # pg + drizzle
src/db/schema/users.ts         # better-auth tables
src/db/schema/sessions.ts
src/db/migrate.ts              # CLI de migraciones
src/lib/password.ts            # bcryptjs wrapper
src/lib/validate.ts            # Zod helpers
src/prompts/system.ts          # placeholder (lo llenamos en Ola 0.5)
```

**Shared `packages/shared/`:**
```
package.json
tsconfig.json
src/types/user.ts
src/types/auth.ts
src/types/index.ts
```

**CI `.github/`:**
```
workflows/ci.yml               # Node 20, pnpm cache, lint, test, build
```

**Docs `Dobleuno/docs/`:**
```
ROADMAP.md                     # roadmap vivo
CHECKLIST.md
CHANGELOG.md                   # 0.1.0
DILIGENCIA.md
arch/ADR-001-monorepo-pnpm.md
arch/ADR-002-fuente-tow-whfb.md       # revive + acepta
arch/ADR-003-backend-llm.md           # revive + acepta
arch/ADR-004-hosting-hetzner.md
arch/SISTEMA.md
mecanicas/MECANICA-COMPOSICION.md
mecanicas/MECANICA-COMBATE.md
mecanicas/MECANICA-MAGIA.md
guias/setup-dev.md
plan/PLAN.md                   # este doc
plan/PLAN-OLEADAS.md           # este archivo
```

### Decisiones locked
- **better-auth 1.x** con Drizzle adapter.
- **Email/pass** por default. Email verification con link logueado en consola (no SMTP real en MVP).
- **Session JWT** en cookie httpOnly, secure en producción.
- **Password hashing:** bcryptjs cost 12.
- **Pool size:** 10 conexiones a Postgres.
- **Vite:** SWC plugin (no Babel).
- **Bundle target:** ES2022, browserslist `production: ['>0.5%', 'not dead', 'not op_mini all']`.
- **PWA:** vite-plugin-pwa con `registerType: 'autoUpdate'`, workbox runtime caching con `NetworkFirst` para `/api`, `CacheFirst` para assets.
- **Tailwind config:** paleta custom con `forge`, `blood`, `bronze`, `parchment`. Dark mode por default (`darkMode: 'class'`, clase en `<html>`).
- **React Router:** data router con `createBrowserRouter`, `loader` para auth check.
- **Zustand:** 1 store con slices (`authSlice`, `uiSlice`).
- **Dexie:** schema v1 vacío, definido para扩展.
- **Iconos:** script Node que lee `apps/web/public/sigil.svg`, genera PNG con `sharp` en 192, 512, 1024 (maskable), 180 (apple).
- **TS strict:** sí, todas las opciones.
- **ESLint:** `@typescript-eslint/recommended-type-checked`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-tailwindcss`.
- **CI:** matrix Node 20, pnpm cache, `pnpm lint && pnpm test && pnpm build`.

### Acceptance
- `pnpm install` exitoso (sin warnings de peer deps).
- `pnpm dev` levanta cliente (http://localhost:5173) y server (http://localhost:3000) en paralelo.
- Cliente compila sin errores ni warnings de TS.
- Server compila sin errores ni warnings de TS.
- Cliente instala como PWA en iOS Safari (probado con ngrok o similar).
- Pantalla de login se ve con paleta de marca.
- "Registrar" crea user en Postgres, persistido.
- "Login" autentica, redirige a /listas.
- Dark mode = paleta `forge/blood/bronze`.
- `pnpm lint` sin errores ni warnings.
- `pnpm test` pasa (mínimo 3 tests smoke: una utility, un componente, una ruta).
- `pnpm build` produce bundle cliente < 500KB gzipped, server < 5MB.
- `pnpm typecheck` pasa.
- CI verde en PR de prueba.
- README documenta `pnpm dev`, `pnpm build`, `pnpm test`, deploy básico.

### Demo
- 4-5 screenshots: portal-pergamino, login-dark, register-dark, home-dark, manifest.
- GIF: instalando la PWA en un celular (emulador o real).
- Link local con `pnpm dev`.

### Riesgos
- better-auth breaking changes entre versiones → fijo versión, lockfile.
- Tailwind 3 + vite-plugin-pwa + Workbox en iOS Safari quirks → testear desde día 1.
- Conectividad a Postgres local → docker-compose para dev.

---

## 3. Ola 2 — KB local + mirror (5 días)

### Goal
Mirror de `tow.whfb.app` funciona, parser produce JSON limpio para Empire + Bretonia, búsqueda offline en el cliente con cache de Dexie.

### Scope
**In:** script de mirror, parser HTML→JSON, schema en Postgres, búsqueda full-text server, cache en Dexie, UI de búsqueda.
**Out:** RAG (eso es Ola 5), todas las facciones (solo Empire + Bretonia).

### Archivos

**Scripts `Dobleuno/scripts/`:**
```
mirror-tow.ts                  # descarga HTML, respeta robots.txt, log a consola
parse-army.ts                  # HTML → JSON por facción
parse-rules.ts                 # reglas sueltas → JSON
```

**Datos (gitignored):**
```
data/raw/                      # HTML scrapeado, gitignored
data/processed/                # JSON parseado, gitignored
data/.gitignore                # *.html, *.json en raw/ y processed/
```

**Server `apps/server/`:**
```
src/db/schema/units.ts          # units, unit_stats
src/db/schema/weapons.ts
src/db/schema/magic_items.ts
src/db/schema/special_rules.ts
src/db/schema/scenarios.ts
src/db/schema/ingest_log.ts    # tracking de mirror runs
src/routes/rules.ts            # GET /api/rules/search?q=...&faction=...
src/routes/units.ts            # GET /api/units?faction=empire
src/routes/ingest.ts           # POST /api/admin/ingest (manual trigger, admin only)
src/lib/search.ts              # Postgres full-text search (tsvector)
src/lib/parser/army.ts         # HTML army page → units[]
src/lib/parser/weapon.ts
src/lib/parser/magic-item.ts
src/lib/parser/rule.ts
src/lib/parser/__tests__/parser.test.ts   # snapshots de páginas reales
```

**Cliente `apps/web/`:**
```
src/lib/dexie-kb.ts            # Dexie schema para KB
src/lib/kb-sync.ts             # background sync desde server a Dexie
src/components/reglas/SearchBox.tsx
src/components/reglas/RuleCard.tsx
src/components/reglas/UnitCard.tsx
src/components/reglas/MagicItemCard.tsx
src/components/reglas/EmptyState.tsx
src/routes/Reglas.tsx          # refactor con UI real
```

**Mecánicas `Dobleuno/docs/mecanicas/`:**
```
TOW-FACCIONES.md               # estructura de las facciones
MECANICA-INGEST.md             # proceso de mirror + parse
```

### Decisiones locked
- **Mirror:** respeta `robots.txt` y rate limit (1 request / 2 segundos). User agent: `Dobleuno/0.1 (https://dobleuno.app)`.
- **Storage raw HTML:** filesystem local en dev, volumen Docker en prod. Gitignored.
- **Parser:** `cheerio` con selectores robustos. Si no puede parsear, falla loud con error claro.
- **Schema JSON:** versionado, validado con Zod. Schema v1 incluye `{faction, unitName, stats, weapons[], specialRules[], points, options}`.
- **Búsqueda server:** Postgres `tsvector` con índice GIN. `ts_rank` para ranking. Soporta búsqueda por nombre de unidad, regla, magic item.
- **Cache cliente:** Dexie schema v2 con `units`, `weapons`, `magic_items`, `special_rules`, `scenarios`. TTL 24h, invalidación en background.
- **Offline-first:** cliente intenta server, si falla (offline) usa cache. UI muestra "offline" sutil.
- **Solo Empire + Bretonia en MVP.** Las otras 14 facciones se cargan en Fase 2.

### Acceptance
- `pnpm mirror` descarga ~500 páginas sin violar robots.txt ni rate limit.
- `pnpm parse` produce JSON válido para todas las unidades de Empire (60+) y Bretonnia (50+) según tow.whfb.app.
- Server `GET /api/rules/search?q=great+weapon` devuelve Greatsword + regla "great weapon" en < 200ms.
- Cliente busca "great weapon" online → trae del server.
- Cliente busca "great weapon" offline → trae de Dexie cache.
- Suite de tests del parser pasa con fixtures reales (al menos 10 páginas snapshot).
- Sin alucinaciones en data: si tow.whfb.app dice Greatsword S3, nuestro JSON dice S3.

### Demo
- Screenshot: búsqueda online → "great weapon" → Greatsword + regla citada.
- Screenshot: búsqueda offline (DevTools → Network: Offline) → mismo resultado.
- JSON de ejemplo: `data/processed/empire/greatswords.json` con 1 unidad.
- Script que corre `pnpm mirror && pnpm parse && pnpm db:seed` end-to-end.

### Riesgos
- `tow.whfb.app` cambia estructura → parser rompe. Mitigación: tests con snapshots, alert en CI, fallback a KB versionada anterior.
- Rate limit del sitio → ajustar delay, cachear respuestas.
- Parsing de reglas especiales ambiguas (múltiples versiones) → guardar el texto literal, dejar al AI interpretar en Ola 5.

---

## 4. Ola 3 — List builder (7 días)

### Goal
Armar una lista Empire 2000 pts completa, validar, guardar, recargar, exportar.

### Scope
**In:** UI completa de armado, validación de composición TOW en tiempo real, magic items, save/load con sync, export a JSON/texto/BCW.
**Out:** compartir listas entre users (post-MVP), listas públicas (post-MVP), más facciones (Fase 2).

### Archivos

**Cliente `apps/web/`:**
```
src/routes/Listas.tsx          # refactor: lista de mis listas
src/routes/ListaEdit.tsx       # editor de una lista
src/components/listas/FactionPicker.tsx
src/components/listas/ArmyEditor.tsx
src/components/listas/UnitPickerModal.tsx
src/components/listas/UnitRow.tsx
src/components/listas/UnitOptionsPopover.tsx
src/components/listas/CharacterEditor.tsx       # para Héroes / Lord
src/components/listas/MagicItemsPicker.tsx
src/components/listas/CompositionValidator.tsx   # panel lateral
src/components/listas/ListSummary.tsx            # footer con total pts
src/components/listas/ExportMenu.tsx
src/components/listas/EmptyListState.tsx
src/lib/list-validation.ts     # reglas de composición TOW
src/lib/list-export.ts         # JSON, text, BCW
src/lib/list-types.ts          # tipos del editor
```

**Server `apps/server/`:**
```
src/db/schema/lists.ts         # lists, list_units, list_magic_items
src/routes/lists.ts            # CRUD completo
                                # GET    /api/lists
                                # POST   /api/lists
                                # GET    /api/lists/:id
                                # PATCH  /api/lists/:id
                                # DELETE /api/lists/:id
                                # GET    /api/lists/:id/export?format=json|text|bcw
src/lib/list-validator.ts      # validación server-side (defense in depth)
```

**Mecánicas `Dobleuno/docs/mecanicas/`:**
```
MECANICA-COMPOSICION.md        # reglas TOW codificadas (referencia, ya en Ola 0.5)
TOW-COMPOSICION-EMPIRE.md      # reglas específicas de Empire
TOW-COMPOSICION-BRETONIA.md    # reglas específicas de Bretonia
```

### Decisiones locked

**Reglas de composición TOW (a implementar):**
- 0-1 General
- 0-1 BSB (si el General no es BSB)
- Core ≥ 25% del total de puntos
- Una sola unidad ≤ 50% del total
- Special ≤ 50% del total
- Rare ≤ 25% del total
- Lords ≤ 25% (en algunos ejércitos)
- Heroes ≤ 25% (en algunos ejércitos)
- Magic items: máximo 1 por rareza por personaje (comunes: 0-2 según ejército)
- 0-1 War Machine de cada tipo (algunos ejércitos)

**Estructura de datos (TS):**
```ts
type List = {
  id: string
  userId: string
  name: string
  faction: 'empire' | 'bretonnia'
  totalPoints: number
  units: Array<
    | { kind: 'lord'; ref: string; options: {...}; magicItems: [...] }
    | { kind: 'hero'; ref: string; options: {...}; magicItems: [...] }
    | { kind: 'core'; ref: string; size: number; options: {...}; command: { champion?, standard?, musician? } }
    | { kind: 'special'; ... }
    | { kind: 'rare'; ... }
  >
  createdAt: string
  updatedAt: string
}
```

**UX:**
- Vista principal: lista de unidades a la izquierda, validador a la derecha, summary abajo.
- Tocar "+ Añadir unidad" → modal con todas las unidades filtradas por slot (Core/Special/Rare/Character).
- Tocar unidad → bottom sheet con opciones (tamaño, command group, equipment, magic items para personajes).
- Validador en tiempo real: verde si pasa, rojo con mensaje claro si viola.
- Footer con total points y desglose por slot (%).

**Export:**
- JSON: nuestro schema, con versión.
- Texto plano: formato legible, una unidad por línea.
- BCW: formato Battle Chronicler (placeholder, no nos comprometemos con su spec exacta en MVP).

**Sync:**
- Save = POST o PATCH a server.
- Cliente tiene state local (Zustand), server es source of truth.
- Al abrir una lista, GET /api/lists/:id, hidratar state.
- Optimistic update: cambio local se aplica instantáneo, sync en background.

### Acceptance
- Lista Empire 2000 pts: 1 General, 1 BSB, 4 unidades Core, 3 unidades Special, 2 unidades Rare, 2 Lords, 1 Hero.
- Validación: si agrego una 5ta unidad Special y supera 50%, marca rojo con "Special: 1100/1000 pts (110%)".
- Magic items: si pongo 2 raros al mismo personaje, marca "Rare: 2 items (max 1)".
- Save → aparece en /listas.
- Reload → recupera idéntico.
- Edito un modelo del Greatsword (de 20 a 25) → actualiza total a 2000, validación sigue verde.
- Export JSON → archivo válido.
- Export text → legible.
- Mobile-first: todo el flujo funciona en 360px de ancho.

### Demo
- GIF: armar una lista Empire 2000 pts de cero en el celu.
- Screenshot: validador en rojo con violación, luego en verde al fix.
- Screenshot: lista guardada en /listas, con timestamp.
- 3 listas exportadas (JSON, text, BCW placeholder).

### Riesgos
- Reglas de composición TOW son muchas y cambian con erratas → centralizar en `list-validation.ts`, fácil de actualizar.
- Magic items del catálogo son extensos → UI con búsqueda + rareza, no scroll infinito.
- Mobile UX del editor de unidades (muchos campos) → bottom sheet + secciones colapsables, validar en cada paso.

---

## 5. Ola 4 — Battle tracker (7 días)

### Goal
Jugar una batalla Empire vs Bretonia completa (6 turnos), save, reload, post-game con stats.

### Scope
**In:** setup, deployment, las 6 fases, unit state, combat resolver, magic helper, save/load con sync, post-game.
**Out:** realtime sync entre devices (post-MVP), replay de batallas (post-MVP), exportación a PDF del post-game (Fase 2).

### Archivos

**Cliente `apps/web/`:**
```
src/routes/Batalla.tsx         # lista de mis batallas
src/routes/BatallaEdit.tsx     # batalla en curso
src/routes/BatallaPostGame.tsx # resumen
src/components/batalla/BattleSetup.tsx
src/components/batalla/DeploymentView.tsx        # 2D simple, drag/tap
src/components/batalla/PhaseBar.tsx
src/components/batalla/PhaseGuide.tsx            # texto recordatorio de la fase
src/components/batalla/UnitRoster.tsx
src/components/batalla/UnitStateCard.tsx
src/components/batalla/UnitActionsMenu.tsx       # herida, baja, status
src/components/batalla/CombatResolver.tsx        # modal de cálculo
src/components/batalla/MagicPhasePanel.tsx
src/components/batalla/DispelHelper.tsx
src/components/batalla/ShootingPhase.tsx
src/components/batalla/LogFeed.tsx               # log de acciones
src/components/batalla/PostGameSummary.tsx
src/lib/battle-engine.ts       # state machine
src/lib/combat-math.ts         # probabilidades (Monte Carlo, 1000 iter)
src/lib/battle-types.ts
src/lib/battle-export.ts       # JSON battle log
```

**Server `apps/server/`:**
```
src/db/schema/battles.ts       # battles, battle_units, battle_log
src/routes/battles.ts          # CRUD + state sync
                                # GET    /api/battles
                                # POST   /api/battles
                                # GET    /api/battles/:id
                                # PATCH  /api/battles/:id   # state updates
                                # DELETE /api/battles/:id
                                # POST   /api/battles/:id/log
src/lib/battle-state.ts        # validación de transiciones de fase
```

**Mecánicas `Dobleuno/docs/mecanicas/`:**
```
MECANICA-COMBATE.md            # referencia (ya en Ola 0.5, ampliar)
MECANICA-MAGIA.md              # referencia (ya en Ola 0.5, ampliar)
MECANICA-PSICOLOGIA.md         # terror, fear, panic, frenzy
MECANICA-MOVIMIENTO.md         # carga, march, reform
MECANICA-FASES.md              # estructura de las 6 fases
```

### Decisiones locked

**State machine:**
```
setup → deployment → turn(1..N) {
  start → movement → magic → shooting → combat → end
}
→ post_game
```

**Solo una fase activa a la vez.** Cambiar fase requiere confirmar si hay acciones pendientes.

**Combat resolver (probabilístico):**
- Inputs: attacker unit, defender unit, weapons, modifiers, terrain, spells activos.
- Cálculo: 1000 simulaciones Monte Carlo.
- Outputs: expected hits, expected wounds, expected saves, expected casualties, combat result, P(win), P(break), P(rout).
- Latencia target: < 500ms.

**Magic phase:**
- Winds of Magic: 2D6 base + channeling (cada wizard tira 2D6, suma si excede).
- Casting: 2D6 vs (nivel del hechizo × 2).
- Dispel: 2D6 vs casting roll, +2 si lore matching.
- Hex range: 24" para daño directo.
- Botones rápidos: "Castear X", "Dispelar Y", "Generar dados".

**Unit state:**
- HP actual / HP máximo.
- Status: engaged, fleeing, reforming, pursuing, charging, etc.
- Ranks (para infantería).
- Position (opcional, 2D simple).

**Log:**
- Cada acción importante: timestamp + texto.
- Visible en panel lateral o expandable.
- Exportable a JSON.

**Sync:**
- Cada cambio de estado → PATCH al server con optimistic update local.
- Al abrir, GET trae el estado completo, hidrata.
- Conflicto: last-write-wins (un solo device por user por batalla en MVP).

### Acceptance
- Setup: 2 listas cargadas, terreno seleccionado, deployment zones marcadas.
- Deployment: arrastro 4 unidades a la zona. Quedan posicionadas.
- Turno 1 Movement: desplazo 2 unidades. Log muestra los movimientos.
- Turno 1 Magic: casteo "Shield of Saphery" en una unidad. Opp dispela. Log muestra.
- Turno 1 Shooting: handgunners disparan a knights, matan 1. Unit state actualizado.
- Turno 1 Combat: Greatsword carga Knights. Combat resolver calcula. Resultado: win by 3. Knights hacen break test, fallan, huyen.
- End of turn 1: log completo.
- 6 turnos jugados.
- Post-game: muestra ganador, total de wounds por unidad, combats won/lost, magic efficiency, time per phase.
- Save → aparece en /batalla.
- Reload → mismo estado exacto (HP, posición, log).
- Mobile-first: todo el flujo funciona en 360px.

### Demo
- GIF: setup + 3 turnos + post-game en el celu.
- Screenshot: combat resolver con probabilidades visibles.
- Screenshot: magic phase con dados y hechizos.
- Screenshot: post-game con stats.
- JSON battle log exportado.

### Riesgos
- State machine complejo → tests con fixtures de cada transición.
- Monte Carlo lento en mobile → precomputar offline, cachear resultados comunes.
- Mobile UX de unit state (HP, status) → cards grandes con botones tap-friendly, no dropdowns.

---

## 6. Ola 5 — Rules oracle (RAG) (5 días)

### Goal
Una pregunta libre devuelve respuesta con cita a `tow.whfb.app`. Cero alucinaciones.

### Scope
**In:** embeddings + RAG + endpoint /api/ask + UI en Reglas y Batalla.
**Out:** voice input, multi-turn conversation (Fase 2), automatic dispute resolver (Fase 2).

### Archivos

**Server `apps/server/`:**
```
src/lib/embeddings.ts          # OpenAI client wrapper
src/lib/rag.ts                 # embed query + retrieve + build prompt
src/lib/llm.ts                 # DeepSeek client wrapper (vía SDK openai)
src/lib/llm-validate.ts        # valida que la respuesta tenga cita
src/db/schema/embeddings.ts    # pgvector table
src/routes/ask.ts              # POST /api/ask
                                # body: { question, context?: {phase, units, ...} }
                                # response: { answer, citations, confidence }
src/jobs/embed-rules.ts        # corre después de mirror, genera embeddings
src/jobs/mirror-cron.ts        # corre diario 03:00 UTC
src/jobs/scheduler.ts          # node-cron setup
```

**Cliente `apps/web/`:**
```
src/components/oraculo/AskBox.tsx
src/components/oraculo/OracleResponse.tsx
src/components/oraculo/CitationList.tsx
src/components/oraculo/OfflineBanner.tsx
src/components/oraculo/SuggestedQuestions.tsx
src/lib/oracle-api.ts
src/hooks/useOracle.ts         # query, loading, error, citations
```

**Mecánicas `Dobleuno/docs/mecanicas/`:**
```
MECANICA-CITAS.md              # formato de citas, validación
```

### Decisiones locked

**Embeddings:**
- Modelo: OpenAI `text-embedding-3-small` (1536 dim).
- Costo: ~$0.02/1M tokens. Para 500 páginas ≈ $0.10. Trivial.
- Storage: pgvector con índice IVFFlat (lists=100, probes=10).
- Chunking: 512 tokens por chunk, overlap 50 tokens. Por página de tow.whfb.app, ~3-10 chunks.

**RAG flow:**
```
User pregunta
  → embed (OpenAI)
  → query pgvector top_k=5 con threshold 0.7
  → si no hay chunks > 0.7, responder "no tengo info suficiente"
  → si hay, build prompt: system + top 5 chunks + question + context opcional
  → DeepSeek V3 (temperature 0.3, max_tokens 1500)
  → validate response: regex /Fuente: .+/ debe matchear
  → si no valida, retry 1 vez con instrucción más fuerte
  → si retry falla, fallback a "no pude generar respuesta, intentá reformular"
  → devolver { answer, citations, confidence }
```

**Validación de citas:**
- Regex: `/Fuente:\s*(.+?)(?:\n|$)/i`
- Al menos 1 match.
- Cada cita se cross-checa con chunks retrieved: si no aparece en los top 5, descartar y marcar confidence=low.

**Rate limiting:**
- 10 preguntas/minuto por user (better-auth nativo).
- 100 preguntas/día por user (custom check en Postgres).

**Contexto opcional:**
- Si la pregunta es contextual (ej: "¿puedo declarar carga?"), enviar `{phase, units, ...}` al server.
- El prompt incluye el contexto como "estado actual del juego".

**Offline:**
- Si no hay red, UI muestra "El oráculo requiere conexión. Buscá en reglas offline mientras tanto."
- El botón "Preguntar al oráculo" en batalla se deshabilita si offline.

### Acceptance
- 20 preguntas de prueba pasan:
  - 15 con respuesta correcta + cita válida.
  - 3 con "no tengo info suficiente" (preguntas fuera de KB).
  - 2 con rechazo amable (fuera de TOW).
- 5 preguntas de stress (ambiguas, capciosas, multi-regla) → respuesta con cita o clarificación.
- Latencia mediana: < 3s.
- Zero alucinaciones en suite de regresión (todas las respuestas tienen cita válida).
- Post-deploy: preguntas reales del usuario → confidence > 0.7 el 80% del tiempo.

### Demo
- 5 preguntas de ejemplo con respuesta + citas (mostradas en pantalla).
- Screenshot del chat: pregunta + respuesta + citation list.
- Latencia promedio medida: < 3s.
- Costo por pregunta: < $0.01 (embeddings + Sonnet).

### Riesgos
- Alucinaciones del LLM → validación estricta de citas, retry, fallback.
- Costos de API → rate limit, monitoreo.
- pgvector performance con muchas reglas → IVFFlat tuneado, acceptable para MVP.

---

## 7. Ola 6 — Polish + deploy (5 días)

### Goal
PWA instala en iOS + Android, funciona 100% offline, deploy público en Cloudflare Pages + Hetzner.

### Scope
**In:** performance audit, service worker strategy, deploy cliente+server, dominio, README, screenshots.
**Out:** monitoring externo (Fase 2), CI/CD completo (lo básico en Ola 1), backups automatizados (Fase 2).

### Archivos

**Cliente `apps/web/`:**
```
src/components/InstallPrompt.tsx
src/components/UpdatePrompt.tsx
src/hooks/useOnlineStatus.ts
src/hooks/useInstallPrompt.ts
src/hooks/useServiceWorker.ts
vite.config.ts                 # tune de chunking, precache
```

**Server `apps/server/`:**
```
Dockerfile                     # node:20-alpine, multi-stage
.dockerignore
```

**Raíz `Dobleuno/`:**
```
docker-compose.yml             # server + postgres para dev y prod
scripts/deploy-server.sh       # build + push + restart en Hetzner
scripts/deploy-web.sh          # build + wrangler deploy
.github/workflows/deploy.yml   # deploy on tag
```

**Docs `Dobleuno/docs/`:**
```
guias/deploy.md                # paso a paso del deploy
guias/setup-dev.md             # dev local end-to-end
CHANGELOG.md                   # 1.0.0
README.md                      # full, con screenshots
SOURCES.md                     # attribution a tow.whfb.app + GW
```

### Decisiones locked

**Performance:**
- Bundle cliente: target < 500KB gzipped.
- Lighthouse mobile: ≥ 90 en performance, accessibility, best practices, PWA.
- Service worker:
  - `precacheAndRoute` para el shell (HTML, JS, CSS, fonts).
  - `NetworkFirst` con fallback a `CacheFirst` para `/api`.
  - `CacheFirst` con expiración 30 días para assets estáticos.
  - `StaleWhileRevalidate` para KB de reglas.

**Deploy cliente (Cloudflare Pages):**
```bash
pnpm --filter web build
wrangler pages deploy apps/web/dist --project-name dobleuno
```
- Dominio custom: `dobleuno.app` (o `.dev` fallback).
- HTTPS automático.
- Headers de seguridad (CSP, HSTS, X-Frame-Options).

**Deploy server (Hetzner CX22):**
```bash
ssh hetzner "cd /opt/dobleuno && git pull && docker-compose pull && docker-compose up -d --build"
```
- Docker image pushed a GitHub Container Registry.
- `docker-compose.yml` con `server` + `postgres` + volúmenes.
- Backup semanal: snapshot de Hetzner + dump de Postgres a Storage Box (post-MVP, lo dejo configurado pero el cron lo armo en Fase 2).

**Dominio:**
- Comprar `dobleuno.app` (o el que se consiga libre).
- DNS en Cloudflare.
- Proxy enabled.

**CI/CD:**
- Tag `v*` → deploy automático cliente + server.
- PRs → lint + test + build (no deploy).

**Documentación:**
- README: pitch, screenshots mobile, setup local, deploy, links.
- `docs/guias/setup-dev.md`: paso a paso con pnpm, docker, etc.
- `docs/guias/deploy.md`: paso a paso del deploy con Hetzner + Cloudflare.
- `docs/SOURCES.md`: attribution a `tow.whfb.app` + nota sobre GW.

### Acceptance
- Lighthouse mobile ≥ 90 en las 4 categorías.
- PWA instala en iOS Safari (probado en iPhone real).
- PWA instala en Chrome Android (probado en Pixel real).
- Funciona 100% offline después de primer load (Lighthouse PWA audit pasa).
- `https://dobleuno.app` accesible.
- `https://dobleuno.app/api/health` retorna 200.
- Login + list builder + battle tracker + rules oracle + post-game stats funcionan en producción.
- Bundle cliente < 500KB gzipped.
- TTFB < 200ms (medido desde Argentina a Hetzner EU).
- Latencia oracle < 3s p50.
- README con screenshots mobile reales.
- CHANGELOG 1.0.0.

### Demo
- 5 screenshots mobile reales (iPhone + Android).
- GIF: instalando PWA en iOS Safari.
- URL pública: `https://dobleuno.app`.
- Lighthouse score en la portada.
- 1 batalla completa jugada en producción por mí como smoke test.

### Riesgos
- Cloudflare Pages quirks con PWA → ajustar `_headers` y `_redirects`.
- Hetzner EU desde Argentina → ~250ms latencia base, aceptable.
- iOS Safari PWA bugs conocidos (storage, service worker) → testear en device real desde Ola 1, no al final.

---

## 8. Tracking del progreso

- **Por ola:** actualizo `ROADMAP.md` y `CHECKLIST.md` con el estado.
- **Al cerrar ola:** PR con tag `ola-N`, demo en chat, screenshot, video corto.
- **CHANGELOG:** bumped en cada ola.
- **Bloqueos:** los levanto en el momento. No dejo nada para "después".
- **Crisis:** si algo se pasa de scope, recalculo. No heroísmo.

## 9. Risk register cross-wave

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | tow.whfb.app cambia estructura y rompe el parser | Media | Alto | Tests con snapshots, alerta en CI, fallback a KB versionada |
| R2 | LLM alucina reglas y mete la pata en la mesa | Alta | Alto (UX) | Prompt estricto, citations obligatorias, validación, retry, fallback |
| R3 | Server se queda corto para embeddings | Baja | Medio | pgvector es eficiente. Si crece, swap a Qdrant es 1 sprint |
| R4 | Onboarding confunde al usuario | Media | Medio | Wizard corto en Ola 6, "tomá una lista de ejemplo" como default |
| R5 | iOS Safari quirks con PWA | Media | Medio | Testear en iOS Safari desde Ola 1, no al final |
| R6 | Proyecto se vuelve pesado y se atrasa | Media | Alto | Olas con scope fijo. Si se pasa, se negocia. No heroísmo. |
| R7 | DeepSeek API rate limit / down | Baja | Alto | Fallback a `deepseek-reasoner` (mismo vendor). |
| R8 | better-auth breaking changes | Baja | Medio | Lockfile estricto, test suite contra la versión exacta. |
| R9 | El usuario (vos) cambia de idea a mitad de Ola N | — | — | Estructura monorepo lo hace barato. Recalculamos. |
| R10 | Conectividad a Hetzner desde Argentina | Baja | Bajo | ~250ms, aceptable. CF Pages edge compensa. |

## 10. Lo que NO está en este plan (a propósito)

- No hay fechas absolutas (calendario). Son olas por semanas, vos me decís cuándo arrancás.
- No hay team multi-agente. Yo codeo, vos jugás y revisás.
- No hay marketing post-MVP. El deploy es para vos, no para usuarios externos.
- No hay analytics de uso. Es tu app, tu server, tu data.
- No hay CI/CD complejo. Tags deploys, PRs validan.
- No hay disaster recovery. Backups los armo en Fase 2.

---

## 11. Resumen ejecutivo

**30-35 días hábiles, 7 olas, MVP en mano.**

Al final de Ola 6: una PWA mobile-first que vos instalás en tu celu, te logueás, armás una lista Empire 2000 pts, jugás una batalla completa contra Bretonia, preguntás al oráculo sobre reglas complicadas, tenés tu historial con stats, y todo sincroniza entre tus devices. Funciona offline. Está deployada y accesible.

**Costo operativo mensual: ~€5 (Hetzner) + $5-10 (LLM usage) + $10/año (dominio).**
**Costo de desarrollo: tu tiempo de revisar demos en mesa + el mío de codear.**

---

*Aprobado para ejecución: 2026-07-08*
*Próxima acción: arrancar Ola 0.5 con el prompt v1*
