# ADR-006: React app como single source of truth (post-Ola 8)

| Campo | Valor |
|---|---|
| **Decisión** | La app React (`apps/web/`) es el **único lugar** donde vive la lógica post-login. El portal Astro (`portal/`) queda como anexo público/SEO hasta Ola 11. |
| **Estado** | Accepted |
| **Fecha** | 2026-07-10 |
| **Supersedes** | D8 (PLAN-OLEADAS) — "Portal HTML local por ahora" |
| **Superseded by** | ADR-011 (cláusula de SEO y retiro del portal) |
| **Impacto** | Un solo deploy para el usuario autenticado. Auth, estado y routing viven en React. Migración futura del portal a React con SSR (Ola 11) si crece el tráfico SEO. |

> **Nota (Ola 11, 2026-09-14):** la cláusula "el portal se mantiene como anexo público/SEO" quedó
> superada por el [ADR-011](ADR-011-codex-react-noindex.md). El fundamento de acá — que las reglas
> son contenido estático ideal para indexar — suponía que el portal tenía reglas publicadas. No las
> tenía: el mirror nunca capturó contenido y el portal nunca se desplegó. El portal se retiró y el
> Codex se sirve desde React, sin indexar.

## Contexto

Al cerrar Ola 7.1 (v0.8.0) tenemos:

- `apps/web/` (React 18 + Vite) — auth (better-auth), listas, batallas, KB sync admin, reglas in-app
- `portal/` (Astro 7) — landing pública con Codex traducido al español

Cada uno tiene su propio dev server (5173 y 4321), su propio bundle, su propio deploy. Para el usuario no autenticado, esto funciona: el portal es SEO-friendly y la app es interactiva. Pero para el usuario autenticado, la promesa de Dobleuno es un solo sitio con todos los módulos accesibles desde un shell coherente.

El replan 2026-07-10 con el usuario introdujo 4 módulos nuevos (Home del club, Mesas, Crónicas + IA), todos en la app autenticada. Multiplicar eso por 2 sitios significa duplicar auth, estado, routing — duplicar el costo de mantener.

## Decisión

La app React es la fuente de verdad. El portal Astro:

- **Se mantiene** como anexo público/SEO del Codex traducido (las reglas son contenido estático ideal para indexar).
- **No recibe** nuevos módulos (Calendar, Galería, Home del club van solo en la app).
- **Se migra** a React con SSR/SSG en Ola 11 si crece el tráfico que justifique el SEO.

## Consecuencias

### Positivas

- Un solo bundle de auth, un solo Zustand store, una sola sesión.
- Tabs/shell unificados (UX moderna tipo Linear/Vercel).
- Build/deploy consolidado (Ola 12).
- Menor superficie de bugs (un solo routing, un solo middleware).

### Negativas

- Pérdida temporal de SEO del portal cuando lo apaguemos. Mitigamos en Ola 11 con SSR.
- Los componentes Astro del Codex hay que portearlos a React (Ola 11).
- El portal puede quedar "congelado" durante varias olas si la Ola 11 se atrasa.

### Trade-offs aceptados

- Multi-idioma del portal: si fuera clave, esto sería motivo para no hacerlo. Pero el club es hispanohablante, así que no bloquea.
- Performance percibida: el portal cargaba más rápido que una SPA. Pero la app está en buen estado (180KB gzipped main, 565KB PWA precache).

## Reversibilidad

La decisión es **reversible en Ola 11** si el tráfico SEO lo justifica. No quemamos puentes con el portal.