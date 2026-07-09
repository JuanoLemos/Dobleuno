# Dobleuno — Changelog

Todas las versiones notables.

## [Unreleased] — Ola 1 (en curso)

### Added
- **Monorepo npm workspaces**: `apps/web`, `apps/server`, `packages/shared`
- **Cliente PWA**: Vite 5 + React 18 + TS 5 + Tailwind 3.4 + vite-plugin-pwa
  - Brand colors: forge / blood / bronze / parchment / ink
  - Dark mode por default con paleta de marca
  - 3 tabs mobile-first: Listas / Batalla / Reglas (placeholders en Ola 1)
  - Bottom nav con iconos Lucide
  - Toast system
  - UI primitives: Button (4 variants), Input, Card, Toast
  - Auth flows: Login, Register (con better-auth client)
  - Routing con React Router 6 (data router-ready)
  - i18n con react-intl (es-AR + en)
  - Service worker configurado con Workbox (precache + runtime cache)
  - Manifest PWA con iconos maskable
  - Script de generación de iconos desde SVG (`scripts/generate-icons.mjs`)
  - PWA README con instrucciones de install
- **Server**: Express 4 + TS 5 + Drizzle + better-auth + Postgres 16
  - Endpoints: `/api/health`, `/api/auth/*` (delegado a better-auth)
  - Drizzle schema para users/sessions/accounts/verification + placeholders lists/battles
  - env validation con Zod
  - CORS configurado
  - Logger minimalista
  - Migrate CLI
- **Shared package** (`@dobleuno/shared`): tipos compartidos cliente ↔ server
  - User, Auth, List, Battle, KB types
- **Tests**:
  - Web: 2 suites (UI primitives + smoke routes), 7 tests
  - Server: 1 suite (health + 404), 3 tests
- **CI**: GitHub Actions con lint + typecheck + test + build
- **docker-compose.yml** para Postgres local
- **Documentación**:
  - `docs/arch/SISTEMA.md` (arquitectura)
  - `docs/Sources.md` (atribución a tow.whfb.app + GW)
  - `README.md` completo
- **Tailwind config** con paleta brand custom
- **vite-plugin-pwa** con cache strategies

### Changed
- Migrado de npm standalone a npm workspaces (monorepo)
- App estructura reorganizada en `apps/web` + `apps/server` + `packages/shared`

### Notes
- El prompt v0.1 (Ola 0.5) se preserva en `apps/server/src/prompts/`
- Tests del prompt siguen pasando (37 estáticos + 11 live gated on DEEPSEEK_API_KEY)
- PWA deshabilitado en dev (HMR sin SW)
- Auth verification email deshabilitado en MVP (sin SMTP)

## [0.1.0] — 2026-07-08 — Ola 0.5 cerrada

(Ver CHANGELOG anterior; prompt v0.1 con DeepSeek, 10/10 preguntas pasan)

## [0.0.0] — 2026-07-08

(Repo inicial)

---

*Formato basado en [Keep a Changelog](https://keepachangelog.com/).*
