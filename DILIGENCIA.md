# Diligencia v4.3.1 — Estructura estándar para Claude Code

Sello de metodología para proyectos adaptados a Diligencia.

---

## Qué es

Diligencia es una convención de estructura de documentación y gobernanza para proyectos
trabajados con Claude Code. Define dónde vive cada tipo de archivo, cómo se nombran las
variables de ruta, y cómo se organizan los comandos.

## Convención

| Tipo | Ubicación |
|---|---|
| Roadmap | `ROADMAP.md` (raíz) |
| Changelog | `CHANGELOG.md` (raíz) |
| ADRs, sistema, bitácora | `doc/arch/` |
| Guías de usuario | `doc/guias/` |
| Mecánicas del proyecto | `doc/mecanicas/` |
| Variables de ruta y reglas | `CLAUDE.md` → `Mapeo de rutas` (SSOT, auto-cargado por Claude Code) |
| Comandos | `~/.claude/commands/` (globales — no requieren copia local) |
| Skills | `~/.claude/skills/diligencia-*/` |
| Agentes de gobernanza | `~/.claude/agents/` |

## Proyectos adaptados

| Proyecto | Fecha | Estado |
|---|---|---|
| Diligencia (autor) | 2026-07-31 | ✅ |
| Dobleuno | 2026-09-14 | ✅ adaptado en v1.0.1 (Flujo B: docs/ → doc/, changelogs unificados) |

## Historial

| Versión | Fecha | Cambios |
|---|---|---|
| v4.3.1 | 2026-08-24 | Shell-lock, chequeos 1h/1i en /salud, resolución de <último-release> por commit **o** tag. |
| v4.1.0 | 2026-07-31 | Adaptación a Claude Code nativo: comandos/skills/agentes reales (`.claude/`), CLAUDE.md como SSOT único (reemplaza AGENTS.md + HARNESS.md). OpenCode queda deprecado como target. |
| v1.0 | — | Convención inicial: doc-base template, $variables, dos capas de comandos, /adaptar global. |

## Archivos relacionados
- `ROADMAP.md` — roadmap del proyecto
- `CHANGELOG.md` — historial de versiones
- `CLAUDE.md` — variables de ruta y reglas
