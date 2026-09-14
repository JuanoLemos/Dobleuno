# Walkthrough — SISTEMA.md al día y lista de ADRs corregida

**Fecha:** 2026-09-14 02:00 · **Comando:** `/CBP commit` + bump a v1.0.3 · **Modelo:** Claude Opus 5

---

## Qué se hizo

`doc/arch/SISTEMA.md` describía el sistema de la Ola 7.1: no existían mesas, ni club, ni el
portal Astro, ni el SPA fallback del server. Se actualizó a v1.0.2 real. Al hacerlo apareció
que la lista de ADRs del documento no coincidía con los ADR que existen en disco.

## Cambios aplicados

| Archivo | Cambio |
|---|---|
| `doc/arch/SISTEMA.md` | Diagrama con endpoints y tablas de Olas 8 y 9, SPA fallback, portal Astro; sección nueva del pipeline del oráculo; Node 22; TabShell en vez de bottom-nav; TZ; pipeline de CI con conteos reales; tabla de ADRs corregida |
| `doc/arch/status-salud.md` | Gap "SISTEMA no menciona mesas ni SPA fallback" cerrado |
| `INDEX.md` | Fila de SISTEMA.md a v1.0.2 / 2026-09-14 |
| `CHANGELOG.md` | Entrada en `[Unreleased]`, después movida a `[1.0.3]` por el bump |

## Decisiones

| Decisión | Fundamento |
|---|---|
| La tabla de ADRs lista solo los que existen como archivo (005–009) | El doc numeraba un "ADR-006: KB sync vía endpoint admin" que choca con el ADR-006 real (React single source of truth). Renumerar los archivos habría roto las referencias cruzadas de Olas 8 y 9; documentar la decisión de KB sync donde ya está (CHANGELOG de v0.8.0) no rompe nada |
| ADR-001 a 004 no se crean retroactivamente | Esas decisiones ya están en `doc/plan/PLAN.md` como D1–D14. Inventar los archivos ahora sería documentación arqueológica, no una decisión tomada en su momento |
| pgvector queda declarado como requisito duro | Es la consecuencia real de haber borrado el fallback ILIKE en v1.0.1; el documento tenía que decirlo para que nadie despliegue sin la extensión esperando que el oráculo funcione |

## Evidencia (R16)

```
17 links markdown revisados, 0 rotos
19 variables de CLAUDE.md revisadas, 0 rotas
CI run 103849647071 ✓ (commit) · v1.0.3 ✓
```

ADRs en disco: `ls doc/arch/ADR-*.md` → 005, 006, 007, 008, 009.

## Pendientes

- [ ] El oráculo sigue sin prueba punta a punta contra DeepSeek real: los live tests se saltean con key placeholder. Haría falta un secret en CI (gasta créditos por push) o un mock a nivel de suite live.
- [ ] `AskOutput.fallback` quedó fijo en `'pgvector'` — el campo ya no distingue nada. Evaluar si vale la pena mantenerlo en la respuesta de `/api/ask`.
- [ ] Olas 10–12 del roadmap: Crónicas (galería + AI stories), migración del Codex a React, deploy consolidado.

## Commits

| Hash | Mensaje |
|---|---|
| `ff1a971` | `docs(arch): SISTEMA.md al día con Olas 8 y 9` |
| `97fe4f6` | `chore(release): v1.0.3` |
