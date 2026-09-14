# Dobleuno — CLAUDE.md

Documento único (SSOT) de este proyecto para Claude Code. Define identidad, variables de
ruta, stack, y reglas operacionales heredadas de Diligencia.

Dobleuno es una companion app de mesa para **Warhammer: The Old World**: PWA mobile-first con
armybuilder, tracker de batalla, oráculo de reglas (RAG) y calendario de mesas del club.
Software libre, gratuito y no-comercial. No afiliado a Games Workshop.

## Idioma

Español — todas las respuestas del agente deben ser en español. Si el agente contesta en
inglés, recordarle explícitamente que responda en español.

Emojis: permitidos y recomendados. ✅🔴🟡🟢

## Prioridad MCP — codebase-memory-mcp

Si `codebase-memory-mcp` está disponible como servidor MCP:
- `get_architecture` antes de leer archivos para entender la estructura
- `search_graph` para buscar funciones, clases, rutas por patrón
- `trace_path` para rastrear call chains
- `manage_adr` para gestionar ADRs

**Regla:** primero MCP, después grep. Una query MCP reemplaza ~10 reads de archivo.

## Mapeo de rutas

| Variable | Ruta | Descripción |
|----------|------|-------------|
| $RM | `ROADMAP.md` | Roadmap por olas |
| $ADRS | `doc/arch/` | Architecture Decision Records (ADR-005 … ADR-009) |
| $CHANGELOG | `CHANGELOG.md` | Historial de versiones + bitácora por ola |
| $SISTEMA | `doc/arch/SISTEMA.md` | Arquitectura, stack, dependencias |
| $GUIAS | `doc/guias/` | Setup, deploy, identidad |
| $MECANICAS | `doc/mecanicas/` | Mecánicas de TOW (combate, composición, magia) + Diligencia |
| $MODULES | `doc/MODULES.md` | Mapa de módulos visibles (Codex/Ejércitos/Mesas/Crónicas) |
| $PLAN | `doc/plan/` | PLAN.md y PLAN-OLEADAS.md |
| $QA | `doc/qa/` | Resultados de evaluaciones de prompts |
| $LEGAL | `doc/legal/` | Análisis de licencias y compliance |
| $TESTING | `npm test` | 141 tests (115 server + 26 web) + 11 live skip |
| $BUGS | `doc/arch/bugs.md` | Bug tracker (P1/P2/P3, severidad, estado) |
| $INCIDENTS | `doc/arch/incidentes.md` | Incidentes runtime y crashes |
| $BITACORA | `doc/arch/bitacora.md` | Índice de sesiones (1 línea c/u, append-only) |
| $WALKTHROUGH | `doc/arch/walkthrough/` | Detalle por sesión (`YYYY-MM-DD_HHMM_<comando>_<tema>.md`) |
| $LOCK | `diligencia-lock.json` | Manifiesto de sincronización con el template |
| $MAIN_APP | `apps/web/src/App.tsx` | Entrada del cliente (rutas + providers) |
| $SERVER_APP | `apps/server/src/app.ts` | Entrada del server (middlewares + routers) |
| $CRITICAL_FILES | `apps/server/src/lib/rag.ts`, `apps/server/src/lib/auth.ts`, `apps/server/src/db/schema/`, `apps/web/src/App.tsx` | Archivos para backup crítico |

## Comandos globales (`~/.claude/commands/`, heredados de Diligencia)

Los 32 comandos de Diligencia están disponibles sin copia local. Referencia:
`~/.claude/skills/diligencia-commands/SKILL.md` o `/explica <comando>`.

## Foco por área

- `tx` → Server: `apps/server/` (Express, Drizzle, better-auth, RAG)
- `ui` → Cliente: `apps/web/` (React, Zustand, Tailwind, PWA)
- `ux` → Contenido y presentación: Codex (`apps/web/src/routes/Codex*`, `components/codex/`), `doc/mecanicas/`, i18n
- `kb` → Knowledge base: `scripts/` (mirror, parse, translate), `kb_chunks`, embeddings

## Stack

| Tipo | Comando | Notas |
|---|---|---|
| Test | `npm test` | vitest; server + web en workspaces |
| Lint | `npm run lint` | ESLint flat config, `--max-warnings=0` |
| Verify | `npm run typecheck` | tsc `--noEmit` en los 3 workspaces |
| Start | `npm run dev` | cliente :5173 + server :3000 en paralelo |
| DB | `npm run db:up` + `npm run db:migrate` | Postgres 16 + pgvector vía Docker |

$STACK: monorepo npm workspaces — Node 22 + Express 4 + TypeScript 5 + Drizzle ORM +
PostgreSQL 16/pgvector (server); Vite 5.4 + React 18 + Tailwind 3.4 + Zustand + Dexie + PWA
(cliente); DeepSeek vía SDK `openai` (LLM); better-auth (sesiones).

## Convenciones

- Idioma: español rioplatense en UI, documentación y mensajes de commit.
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `test:`).
- Releases: `node scripts/bump-version.js <version>` — bumpea los 4 `package.json`, mueve
  `[Unreleased]` a la versión nueva, commitea y taguea. No pushea.
- Migraciones: `drizzle-kit generate` para el esquema; el SQL de pgvector
  (`0001_pgvector.sql`) se aplica aparte con `psql`, no está en el journal de Drizzle.
- Tests: los live de DeepSeek se saltean solos si la key es un placeholder (`sk-test-mock`).
- El CI corre migraciones + pgvector + seed de la KB antes de los tests.

## Archivos críticos

Requieren lectura completa antes de editar y backup si el cambio es estructural:

- `apps/server/src/lib/rag.ts` — pipeline RAG del oráculo (retrieval, prompt, citas).
- `apps/server/src/lib/auth.ts` — better-auth, `trustedOrigins`, sesiones.
- `apps/server/src/db/schema/` — esquema Drizzle; todo cambio necesita migración.
- `apps/server/src/db/migrations/` — nunca editar una migración ya aplicada.
- `.github/workflows/ci.yml` — pipeline de verificación.

## Disciplina BUILD

BUILD = aplicar cambios, NO commitear. Solo `/commit`, `/CBP` y `/version` ejecutan
`git commit`. Al terminar cualquier BUILD en este proyecto, reportar cambios aplicados y
sugerir `/CBP`.

## Regla R79.2 — Decisión humana sobre git (heredada de Diligencia)

**SIEMPRE** esperar confirmación explícita del usuario antes de `git commit`, `git push`,
`git tag` o bumpear versión. Patrón: "Recomiendo X porque Y. ¿Procedo (sí/no/cambiar)?" y
esperar respuesta. Excepciones: mandato explícito en el prompt, R-excepción documentada,
tareas read-only.

## Skills

Sin skills locales. El proyecto usa las globales de Diligencia (`diligencia-*`).

## Archivos relacionados
- `ROADMAP.md` — plan por olas
- `CHANGELOG.md` — historial de versiones + bitácora por ola
- `DILIGENCIA.md` — sello de metodología y versión heredada
- `INDEX.md` — catálogo de documentación
- `doc/MODULES.md` — qué ve el usuario en cada módulo
