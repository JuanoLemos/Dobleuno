# Walkthrough — Adaptación a Diligencia (Flujo B)

**Fecha:** 2026-09-14 01:00 · **Comando:** `/adaptar` + `/CBP full` · **Modelo:** Claude Opus 5

---

## Qué se hizo

Dobleuno tenía documentación propia madura pero fuera de la convención Diligencia: `docs/` en
vez de `doc/`, ROADMAP enterrado, y **dos changelogs** que contaban la misma historia distinto.
Se migró la estructura completa, se unificaron los changelogs en uno solo, y se instaló la
estructura de gobernanza (CLAUDE.md como SSOT, INDEX, lock, canónicas).

La sesión venía de antes: se cerró v1.0.0 (Olas 8 y 9, que estaban sin commitear desde julio),
se arreglaron el CI y un bug que dejaba mudo al oráculo, y se versionó v1.0.1.

## Cambios aplicados

| Archivo | Cambio |
|---|---|
| `docs/` → `doc/` | 18 archivos movidos con `git mv` (historial preservado) |
| `ROADMAP.md` | Subido de `docs/` a la raíz |
| `CHANGELOG.md` | Unificación de los dos changelogs: keep-a-changelog + bitácora por ola anidada |
| `CLAUDE.md` | Nuevo — SSOT: 19 variables, stack, archivos críticos, disciplina BUILD, R79.2 |
| `INDEX.md`, `DILIGENCIA.md`, `diligencia-lock.json` | Nuevos — catálogo, sello y manifiesto |
| `doc/mecanicas/`, `doc/arch/`, `doc/guias/` | 14 canónicas del template (6 personalizadas) |
| `doc/arch/status-salud.md` | Nuevo — diagnóstico de salud |
| 17 archivos | Referencias `docs/` reescritas (README, ADRs, LICENSE, código, `.harness/`) |
| `scripts/bump-version.js` | Apunta a `CHANGELOG.md` en la raíz |

## Decisiones

| Decisión | Fundamento |
|---|---|
| Flujo B completo en vez de adaptación mínima | Se ofrecieron las dos con su impacto; el usuario eligió migrar de verdad en vez de dejar `docs/` y solo sumar los archivos de gobernanza |
| Un solo `CHANGELOG.md` con la bitácora anidada | Dos changelogs con versiones solapadas obligan a elegir cuál es la verdad. Anidar la narrativa bajo cada versión conserva todo sin duplicar el índice de versiones |
| `AGENTS.md` se conserva apuntando a `CLAUDE.md` | Otros agentes lo leen por convención; borrarlo rompería ese contrato, y dejarlo sin puntero crearía dos SSOT |
| No se creó `[0.9.0]` como versión | Nunca se tagueó: el release saltó de v0.8.0 a v1.0.0. Inventar la entrada habría falseado el historial |
| Se registró Ola 8 y Ola 0.6 como bitácora, no como versiones nuevas | Misma razón: preservar el relato sin inventar releases |

## Evidencia (R16)

```
19 variables de CLAUDE.md revisadas, 0 rotas
8 links markdown revisados, 0 rotos
Test Files 13 passed | Tests 115 passed | 11 skipped   (server)
Test Files  4 passed | Tests  26 passed                (web)
lint: 0 errores, 0 warnings · typecheck: 0 errores
shell-lock: 45 archivos en el scope — 45 sin cambios
```

## Incidente de la sesión

Al poblar `[Unreleased]` se usó `node -e` con backticks dentro de una cadena de bash. Bash los
interpretó como sustitución de comandos y **ejecutó `scripts/bump-version.js`**, que bumpeó a
v1.1.0, commiteó y tagueó por su cuenta. Nada se había pusheado. Se revirtió: `git tag -d
v1.1.0`, `git reset --soft HEAD~1`, versiones de vuelta a 1.0.1 y CHANGELOG reconstruido desde
el commit accidental quitándole el bloque de v1.1.0. Lección: para contenido con backticks,
escribir el script a un archivo y ejecutarlo, nunca inline en bash.

## Pendientes

- [ ] `doc/arch/SISTEMA.md` quedó en el estado de Ola 7.1 — no menciona mesas ni el SPA fallback del server.
- [ ] El oráculo sigue sin prueba punta a punta contra DeepSeek real (los live tests se saltean con key placeholder).
- [ ] Olas 10–12 del roadmap: Crónicas, migración del Codex a React, deploy consolidado.

## Commits

| Hash | Mensaje |
|---|---|
| (este release) | `chore(release): v1.0.2` — adaptación a Diligencia v4.3.1 |
| `527d7fb` | `docs(changelog): v1.0.1 es 09-13, no 09-14` |
| `c7c3c13` | `chore(release): v1.0.1` |
