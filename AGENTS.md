# AGENTS.md

Dobleuno — companion app de mesa para Warhammer: The Old World. Monorepo PWA con asistente IA, tracker de batalla y KB de reglas offline.

## Setup commands

- Install deps: `npm install --legacy-peer-deps`
- Start dev: `npm run dev` (cliente :5173 + server :3000 en paralelo)
- Build: `npm run build`
- Test: `npm test` (108 tests + 11 live skip)
- Lint: `npm run lint` (ESLint, max-warnings=0)
- Typecheck: `npm run typecheck`
- Format: `npm run format` (Prettier write)
- DB up: `npm run db:up` (Postgres + pgvector en Docker)
- DB migrate: `npm run db:migrate`

## Project layout

- `apps/web/` — Cliente PWA (Vite 5.4 + React 18 + TypeScript 5 + Tailwind 3.4)
- `apps/server/` — API (Express 4 + Drizzle + better-auth)
- `packages/shared/` — Tipos compartidos cliente ↔ server
- `docs/arch/` — ADRs y arquitectura
- `docs/guias/` — Setup, deploy
- `docs/mecanicas/` — Reglas de TOW y mecánicas del juego
- `docs/plan/` — PLAN, PLAN-OLEADAS
- `docs/qa/` — Resultados de tests
- `data/` — Mirror de tow.whfb.app (gitignored)
- `scripts/` — Mirror, parse, translate, bump-version
- `portal/` — Astro project (sitio estático de reglas)
- `.harness/` — Mavis multi-agent team (orchestrator + reins)

## Code style

- TypeScript strict mode (`tsconfig.base.json: strict: true`)
- ESLint + Prettier (configs en raíz)
- 2 espacios de indentación, single quotes
- Conventional commits (en inglés)
- Comentarios y docs en español
- Identificadores en inglés

## Testing instructions

- Unit tests: `npm test` (Vitest)
- E2E: no configurado todavía (TODO ola futura)
- Agregar tests por cada feature nueva — ver `*.test.ts` en el mismo paquete
- Tests live skip (requieren DB) están marcados con `it.skip` o `describe.skip`
- Cobertura objetivo: 80%+

## PR & commit conventions

- Branch desde `main`: `feat/<nombre>`, `fix/<nombre>`, `chore/<nombre>`
- Commits: conventional commits (`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`)
- PR con descripción clara, link a issue si aplica
- Squash merge a main
- Tag semver en releases (`v0.x.y`)

## Seguridad

- `.env` en `.gitignore` — **nunca** commitear secrets
- `apps/server/.env` tiene `ADMIN_EMAILS` para auto-promote a admin
- `DEEPSEEK_API_KEY` y `OPENAI_API_KEY` se leen de env en runtime
- Auth: better-auth (email/pass + sessions)
- Validación de input en endpoints (zod en server)

## Reglas operativas (leer antes de tocar)

- **Dobleuno no es Diligencia.** Es un proyecto adaptado. Las decisiones de Dobleuno se gobiernan acá, no en `C:\xampp\htdocs\Diligencia`.
- **No borrar nada en BD** sin confirmar con el usuario (es Postgres con datos reales del usuario).
- **No tocar `.env`** sin confirmar. Tiene keys de LLM y config de admin.
- **No matar procesos del server** sin confirmar (puede dejar al usuario sin dev server).
- **No commitear** sin confirmación explícita del usuario.
- **Si el usuario se enoja o dice "pará"**: parás, no propongas, no arregles de más. Solo arreglás lo pedido.
- **Instrucciones claras se ejecutan tal cual.** Si dice A o B, hacés eso — sin agregar pasos.

## Disclaimers

- Software libre, no-comercial. Licencia CC BY 4.0. Ver `LICENSE.md`.
- No afiliado a Games Workshop. Reglamento bajo fair use vía mirror de `tow.whfb.app`.
- Ver `docs/Sources.md` para atribución completa de fuentes.

## Related

- `.harness/` — Mavis multi-agent team
- `README.md` — referencia rápida del proyecto
- `docs/plan/PLAN-OLEADAS.md` — roadmap por olas
- `docs/arch/SISTEMA.md` — arquitectura detallada
