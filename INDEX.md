INSTRUCCIÓN: NO modificar este archivo sin entender el catálogo. CONTIENE el mapeo completo de documentación del proyecto. ACTUALIZADO por /version (docs críticos) y /updoc (docs informativos).

# INDEX — Dobleuno

Catálogo de documentación del proyecto. Mantenido por /version y /updoc.

Última actualización global: 2026-09-14

## Docs críticos

Gestionados por /version. La versión se actualiza al cerrar sesión.

| Archivo | Versión | Última actualización | Resumen (L0) |
|---|---|---|---|
| ROADMAP.md | v1.0.1 | 2026-09-13 | Olas 0–9 cerradas; 10–12 pendientes |
| CHANGELOG.md | v1.0.1 | 2026-09-14 | Historial de versiones + bitácora por ola |
| DILIGENCIA.md | v4.3.1 | 2026-09-14 | Sello de metodología del proyecto |
| CLAUDE.md | v1.0.1 | 2026-09-14 | SSOT: variables de ruta, stack, reglas |
| doc/MODULES.md | — | 2026-07-10 | Qué ve el usuario en cada módulo |

## Guías

Gestionadas por /updoc. La versión se actualiza tras sync exitoso.

| Archivo | Versión | Última actualización | Resumen (L0) |
|---|---|---|---|
| doc/guias/deploy.md | — | 2026-07-10 | Hetzner + Cloudflare + docker-compose + volumen kbdata |
| doc/guias/identidad.md | template | 2026-09-14 | Identidad del sistema (canónica de Diligencia) |
| doc/RELEASING.md | — | 2026-07-09 | Convención de versionado y tags |
| doc/Sources.md | — | 2026-07-09 | Atribución de fuentes (tow.whfb.app) |

## Mecánicas

Gestionadas por /updoc. Las 4 canónicas vienen del template y las sincroniza /adaptar Fase 2.5
vía `diligencia-lock.json`; las de dominio (TOW) son del proyecto.

| Archivo | Versión | Última actualización | Resumen (L0) |
|---|---|---|---|
| doc/mecanicas/MECANICA-COMBATE.md | — | 2026-07-08 | Resolución de combate de TOW |
| doc/mecanicas/MECANICA-COMPOSICION.md | — | 2026-07-08 | Reglas de composición de ejército |
| doc/mecanicas/MECANICA-MAGIA.md | — | 2026-07-08 | Fase de magia |
| doc/mecanicas/MANDATO.md | template | 2026-09-14 | Mandato del Director (canónica) |
| doc/mecanicas/MECANICA-AUDIO.md | v1.0.0 | 2026-09-14 | Síntesis de voz ElevenLabs (canónica) |
| doc/mecanicas/MECANICA-CALIDAD.md | v1.3 | 2026-09-14 | Estándares de calidad documental + DoD (canónica) |
| doc/mecanicas/MECANICA-LOCK.md | v1.2.0 | 2026-09-14 | Manifiestos de sincronización por huella (canónica) |

## Arquitectura

| Archivo | Versión | Última actualización | Resumen (L0) |
|---|---|---|---|
| doc/arch/SISTEMA.md | v1.1.0 | 2026-09-14 | Arquitectura, stack, endpoints, pipeline del oráculo |
| doc/arch/ADR_SUMMARY.md | template | 2026-09-14 | Índice de decisiones arquitectónicas |
| doc/arch/ADR-005-llm-provider.md | — | 2026-07-09 | DeepSeek como proveedor LLM |
| doc/arch/ADR-006-react-single-source.md | — | 2026-07-10 | React app como single source of truth |
| doc/arch/ADR-007-tabs-naming.md | — | 2026-07-10 | Naming de módulos en español |
| doc/arch/ADR-008-club-info-model.md | — | 2026-07-10 | Modelo de datos del club (single-row) |
| doc/arch/ADR-009-calendar-data-model.md | — | 2026-07-10 | Mesas / sesiones / reservas |
| doc/arch/ADR-010-cronicas-data-model.md | — | 2026-09-14 | Crónicas: datos, storage y generación |
| doc/arch/bugs.md | template | 2026-09-14 | Bug tracker (P1/P2/P3) |
| doc/arch/incidentes.md | template | 2026-09-14 | Incidentes runtime y crashes |
| doc/arch/backups.md | template | 2026-09-14 | Estado de backups y pruning |
| doc/arch/bitacora.md | template | 2026-09-14 | Índice de sesiones (append-only) |
| doc/arch/walkthrough/_template.md | template | 2026-09-14 | Plantilla de detalle por sesión |

## Plan y QA

| Archivo | Versión | Última actualización | Resumen (L0) |
|---|---|---|---|
| doc/plan/PLAN.md | — | 2026-09-13 | Plan de ejecución de alto nivel |
| doc/plan/PLAN-OLEADAS.md | — | 2026-09-13 | Brief por ola (0.5 → 7.1) |
| doc/qa/prompt-v0.1-results.md | — | 2026-07-09 | Resultados de la suite live del prompt |

## Legal

| Archivo | Versión | Última actualización | Resumen (L0) |
|---|---|---|---|
| doc/legal/ANALISIS-LICENCIAS-COMPLIANCE.md | — | 2026-07-10 | Licencias, compliance y marca |
| LICENSE.md | — | 2026-07-09 | CC BY 4.0 + atribución de fuentes |

## Archivos relacionados
- `CLAUDE.md` — variables de ruta y reglas del proyecto
- `DILIGENCIA.md` — sello de metodología
- `diligencia-lock.json` — manifiesto de sincronización con el template
