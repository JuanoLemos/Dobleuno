# Dobleuno — Changelog

Bitácora por versión. Fechas y commits por ola.

## v1.0.0 — Ola 9: Mesas (Calendar multi-mesa) (2026-07-10)

> **Cierre de release: 2026-09-13.** Las Olas 8 y 9 se terminaron el 2026-07-10 pero quedaron
> sin commitear. Al retomar, el árbol no compilaba (`Home.tsx`) ni pasaba lint, y un test del
> server había quedado obsoleto. Se arreglaron esos seis puntos, se agregaron las claves i18n
> `club.*` faltantes, y se tagueó v1.0.0 con todo junto — incluido trabajo temprano de Olas 10–11
> (home cream, SPA fallback del server) que estaba en el mismo árbol. Detalle en `docs/CHANGELOG.md`.

### Highlights

- **Calendar multi-mesa**: el admin publica sesiones ("Sábado 14hs, mesa 1, 2000 pts") y los jugadores reservan plaza. Anti-doble-booking por user + por cupo. Ver ADR-009.
- **Reserva con lista opcional**: si el user tiene una lista del armybuilder guardada, puede anclarla a la reserva (preparado para Fase 2 — battle tracker).
- **Single-tenant MVP**: un deploy = un club. Multi-club queda para Fase 2.

### Backend

- `db/schema/mesas.ts` — tablas `mesas`, `sesiones`, `reservas` + enum `formato_sesion` ('2000' | '2500' | 'open').
- `db/migrations/0003_stale_master_mold.sql` — generado con drizzle-kit.
- `routes/mesas.ts` — CRUD admin + GET público (sin auth).
- `routes/sesiones.ts` — CRUD admin + GET público (default futuras, `?includePast=true` para admin).
- `routes/reservas.ts` — `POST /api/sesiones/:id/reservar`, `DELETE /api/sesiones/:id/reservar/:rid`, `GET /api/mis-reservas`.
- **Anti-doble-booking**: `UNIQUE(sesion_id, user_id)` en DB. Validación de capacidad `count(reservas) vs mesa.capacidad` antes de insertar.
- Tests: 15 nuevos (mesas.test.ts 10 + reservas.test.ts 5) sin regresiones. Total server: 12 archivos, 100+ tests pasando.

### Frontend

- `lib/mesas-api.ts` — client (`mesasApi`, `sesionesApi`).
- `lib/reservas-api.ts` — client (`reservasApi.create`, `.cancel`, `.misReservas`, `.list`).
- `lib/modules.ts` — módulo `mesas` registrado con icono `CalendarDays`, `requiresAuth: true`.
- `routes/Mesas.tsx` — vista jugador: sesiones agrupadas por semana ("Esta semana", "Próxima semana", "Más adelante"), empty state, login prompt si no está logueado.
- `components/mesas/SesionCard.tsx` — card con fecha AR, mesa, formato, cupos X/Y, botón reservar/cancelar.
- `components/mesas/MesasAdmin.tsx` — modal admin con tabs Sesiones/Mesas + SesionForm + MesaForm.
- `App.tsx` — ruta `/mesas` registrada.
- i18n: `mesas.title`, `mesas.empty`, `mesas.placeholder` (es-AR + en).

### Decisiones de usuario

- Capacidad por mesa (enum 2/4/6/8), no por sesión.
- GET público de sesiones y reservas (anima a registrarse para reservar).
- Hard delete de sesiones con cascade a reservas (admin es responsable).
- Soft delete de mesas (`activa=false`).
- TZ: server UTC, UI `America/Buenos_Aires` con `Intl.DateTimeFormat`/toLocaleString.

### ADRs

- ADR-009 — Calendar data model (mesas/sesiones/reservas + capacidad + reservas).

### Bugfixes preexistentes encontrados

- `req.params.id` con `noUncheckedIndexedAccess: true` requiere `as string` (Express 5 lo tipea como `string | string[] | undefined` por wildcards). Patrón aplicado a todas las rutas con params.

---

## v0.9.0 — Ola 8: Home del club + TabShell (2026-07-10)

### Highlights

- **Single source of truth**: React app es el único lugar donde vive la lógica post-login. Portal Astro queda como anexo SEO. Ver ADR-006.
- **TabShell**: header horizontal sticky con tabs `Codex` / `Ejércitos` (Mesas y Crónicas se agregan en Ola 9 y 10). El bottom-nav antiguo se eliminó. Ver ADR-007.
- **Club banner**: header secundario compacto con el nombre del club + horarios + dirección. Click expande modal con info completa + CTA "Editar" si sos admin. Ver ADR-008.

### Backend

- `db/schema/club.ts` — tabla `club_info` (single-row, id=1).
- Migración `0002_club_info.sql`.
- `routes/club.ts` — `GET /api/club` (público, sembrado default) + `PUT /api/club` (requireAdmin).
- `lib/auth.ts` — `trustedOrigins` configurado para `localhost:5173` (Vite) y `localhost:4321` (portal). Bug preexistente que rompía sign-in cross-origin.
- Tests existentes: 88 passed + 11 skipped (sin regresiones).

### Frontend

- `components/Sigil.tsx` — extraído (era inline en AuthLayout).
- `lib/modules.ts` — registry de módulos del shell (id, label, route, icon, requiresAuth).
- `lib/club-api.ts` — client (`get` + `update`).
- `components/shell/TabShell.tsx` — layout raíz (header + club banner + tabs + outlet + footer).
- `components/shell/NavTabs.tsx` — tabs horizontales con scroll mobile.
- `components/shell/ClubBanner.tsx` — banner compacto + modal expandido.
- `components/layout/AppShell.tsx` — ahora alias de TabShell (back-compat).
- `routes/AuthLayout.tsx` — sin cambios funcionales (Sigil extraído).
- `App.tsx` — home `/` redirige a `/reglas` (Codex por default, público).

### Bugfixes preexistentes

- `vite.config.ts` — proxy `/api → http://localhost:3000`. Sin esto, el cliente React no podía hablar con el backend en dev.
- `lib/auth.ts` — `trustedOrigins` agregado (el cliente React corría en otro puerto y better-auth lo rechazaba).

### ADRs

- ADR-006 — React app single source of truth.
- ADR-007 — Naming de módulos en español.
- ADR-008 — Modelo de datos del club (single-row, single-tenant).

### Tests

- `apps/web/src/test/smoke.test.tsx` actualizado para los nuevos tabs (`Codex`, `Ejércitos`) + mock de `club-api`.
- 22 tests passed (de 19 antes — +3 nuevos).

### Decisiones de usuario

- Routing: tabs visibles siempre (sin redirección a /app si logueado).
- Tabs UI: header horizontal sticky (móvil + desktop).
- Placeholders: solo tabs de módulos implementados (Mesas y Crónicas NO se muestran hasta Ola 9/10).

---

## v0.8.1 — Ola 0.6: UI v2 + Branding IA (2026-07-10)

### Highlights

- Portal Astro recibió un rebrand visual completo: 2 pieles (Cartógrafo + Codex) × 2 modos (light/dark).
- Brand kit generado con Matrix MiniMax: 3 escudos, 3 hero backgrounds, 1 escena ambient, 2 tiles.
- Branding aplicado a portal (home, /reglas, /sobre) + armybuilder (login + cards).

---

## v0.8.0 — Ola 7.1: KB Sync Admin (2026-07-09)

(Ver `git log v0.8.0` — primera versión estable con admin sync.)

---

## Formato de entradas

- **Highlights** — 1-2 frases del impacto del release.
- **Backend / Frontend** — cambios concretos por capa.
- **Bugfixes preexistentes** — bugs encontrados y arreglados en passant.
- **ADRs** — decisiones arquitectónicas locked en el release.
- **Tests** — qué se rompió/qué se agregó.
- **Decisiones de usuario** — lo que se consultó al usuario en el replan.