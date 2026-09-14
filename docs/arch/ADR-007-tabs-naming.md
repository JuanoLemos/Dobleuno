# ADR-007: Naming de módulos en español (Codex / Ejércitos / Mesas / Crónicas)

| Campo | Valor |
|---|---|
| **Decisión** | Los módulos del shell se llaman en **español rioplatense**: **Codex**, **Ejércitos**, **Mesas**, **Crónicas**. El código interno y los paths mantienen nombres en inglés/latino. |
| **Estado** | Accepted |
| **Fecha** | 2026-07-10 |
| **Supersedes** | N/A |
| **Superseded by** | N/A |
| **Impacto** | UX en español para el club. i18n centralizado en `@dobleuno/shared` para que sea fácil cambiar a otros idiomas en Fase 2+. |

## Contexto

Dobleuno es un proyecto para clubes de TOW. El público objetivo habla español rioplatense. Los nombres de los módulos deben ser:

1. **Inmediatamente entendibles** — un jugador nuevo del club debería saber qué hace cada tab sin leer tooltips.
2. **Corto** — mobile-first, los tabs en header horizontal compiten por espacio.
3. **Consistente** — todos los tabs en la misma lengua, mismo "nivel de poesía".

Las alternativas en inglés (Codex / Lists / Calendar / Chronicles) funcionan para devs pero no para jugadores casuales. Las alternativas demasiado literales ("Reglas / Listas / Reservas / Galería") pierden el alma.

## Decisión

| Tab | Significado | Razón |
|---|---|---|
| **Codex** | Reglamento | Sin traducir. Universal para jugadores de TOW. Refuerza el branding medieval. |
| **Ejércitos** | Listas / armybuilder | "Listas" era plano. "Ejércitos" evoca el lado épico de TOW. |
| **Mesas** | Calendar multi-mesa | "Reservas" era administrativo. "Mesas" es la unidad física del club. |
| **Crónicas** | Galería + AI battle stories | "Galería" era plano. "Crónicas" refuerza el alma narrativa + evoca los libros de historia de GW. |

## Consecuencias

- **Internacionalización futura:** si en Fase 2 queremos traducir la app, los nombres van a un archivo i18n central (`@dobleuno/shared/src/i18n/es-AR.json` ya existe, Ola 1).
- **Code paths:** seguimos con `routes/listas`, `routes/reglas`, `routes/calendario` (futuro), etc. La UI label viene de i18n.
- **Tabla de módulos:** nueva `apps/web/src/lib/modules.ts` con `{ id, label, route, requiresAuth, icon }`. El `NavTabs` consume esa tabla.

## Reversibilidad

Fácil. Cambiar labels es 1 archivo (`@dobleuno/shared/src/i18n/es-AR.json`) + un par de iconos en `modules.ts`.