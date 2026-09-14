# Versioning

Dobleuno usa [Semantic Versioning 2.0.0](https://semver.org/). El versionado se aplica a todo el monorepo (cliente + server + shared).

## Estado actual

| Versión | Estado | Notas |
|---|---|---|
| `0.0.0` | ✅ Cerrado | Repo inicial, decisiones + plan |
| `0.1.0` | ✅ Cerrado | Ola 0.5: prompt v0.1 con DeepSeek |
| `0.2.0` | ✅ Cerrado | Ola 1: Foundation (monorepo, PWA, auth) |
| `0.3.0` | ✅ Cerrado | Ola 2: KB local + mirror tow.whfb.app |
| `0.4.0` | ✅ Cerrado | Ola 3: List builder |
| `0.5.0` | ✅ Cerrado | Ola 4: Battle tracker |
| `0.6.0` | ✅ Cerrado | Ola 5: Rules oracle (RAG) |
| `0.7.0` | ✅ Cerrado | Ola 6: Polish + deploy |
| `0.8.0` | ✅ Cerrado | Ola 7.1: KB sync admin (post-MVP patch) |
| `0.9.0` | ✅ Cerrado | Ola 8: Home del club + shell con tabs |
| `1.0.0` | ✅ Cerrado | Ola 9: Mesas y reservas |
| `1.0.1`–`1.0.3` | ✅ Cerrado | Correcciones y adaptación a Diligencia |
| `1.1.0` | ✅ Cerrado | Ola 10: Crónicas (relato con IA + galería) |
| `1.2.0` | ✅ Cerrado | Ola 11: Codex en React + el pipeline por fin baja contenido |
| `2.0.0` | ✅ Cerrado | Ola 12: deploy consolidado |

### Por qué la Ola 12 es un major

No hay ruptura de API — el contrato HTTP no cambió. El major marca dos cosas:

1. **El hito**: es la primera versión que se puede desplegar. El `docker build` había fallado
   siempre y nadie lo sabía.
2. **Ruptura de compatibilidad de configuración**, que es real y afecta a cualquiera que tuviera un
   deploy andando: en producción ahora son obligatorias `DATABASE_URL` (no localhost),
   `BETTER_AUTH_URL` (no localhost), `BETTER_AUTH_SECRET` (32+ caracteres y fuera de la lista negra)
   y `DEEPSEEK_API_KEY`; `OPENAI_API_KEY` pasa a estar **prohibida**; y `VITE_API_URL` cambia de
   semántica: vacío ya no significa "caé a localhost" sino "mismo origen".

   Un deploy que dependía de los defaults permisivos deja de arrancar. Es el punto, no un efecto
   colateral — pero es exactamente lo que semver llama breaking.

## Esquema

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (1.x): cambios incompatibles. Reservado para MVP público.
- **MINOR** (0.X): nuevas features. Cada ola es un minor bump.
- **PATCH** (0.X.Y): bugfixes, mejoras de performance, cambios sin impacto en la API.

Pre-1.0 (0.x): cualquier bump puede traer cambios incompatibles. Estamos en desarrollo activo.

### Convención para olas "point" (N.M)

A partir de Ola 7.1, una ola puede sub-dividirse cuando el scope se ejecuta como patch post-MVP pero antes de la siguiente ola planeada. Convención:

- **Tag:** se conserva el MINOR de la ola madre y se incrementa el PATCH (e.g. Ola 7 madre → v0.7.0 → Ola 7.1 patch → v0.8.0).
- **Nombre:** mantiene el sufijo `.N` solo en ROADMAP / CHANGELOG; el tag de git y el version de npm reflejan el bump de PATCH.
- **Entry en CHANGELOG:** las olas `.N` se documentan como entrada propia bajo el número que les toca en el versionado, no como sub-ola de la madre.
- **Ejemplo real:** Ola 7.1 → tag `v0.8.0` → entrada CHANGELOG `[0.8.0] — Ola 7.1 cerrada (KB sync admin)`.

## Proceso de release

1. Cerrar la ola → branch `ola-X` con todos los cambios mergeados a `main`
2. Bump version en:
   - `apps/web/package.json`
   - `apps/server/package.json`
   - `packages/shared/package.json`
3. Tag git: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
4. Push tag: `git push origin vX.Y.Z`

Los pasos 2 y 3 los hace `node scripts/bump-version.js <major|minor|patch|X.Y.Z>`, que además mueve
el contenido de `[Unreleased]` a la sección de la versión nueva en el CHANGELOG. **No pushea**: eso
queda como decisión humana.

No hay release automática desde CI, ni publicación de imágenes a un registry. Ver el ROADMAP.

## Convención de commits

Inspirado en [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[body opcional]

[footer opcional]
```

**Types:**
- `feat` — nueva feature
- `fix` — bug fix
- `docs` — solo documentación
- `style` — formateo, no cambio de código
- `refactor` — refactor sin cambio de comportamiento
- `test` — agregar o fix tests
- `chore` — tareas de mantenimiento (deps, build, etc.)
- `perf` — mejora de performance
- `revert` — revierte un commit

**Scopes comunes:**
- `web` — cliente
- `server` — server
- `shared` — tipos compartidos
- `prompts` — sistema de prompts del AI
- `docs` — documentación
- `ci` — CI/CD
- `deps` — dependencias

**Ejemplos:**
```bash
git commit -m "feat(web): agrega búsqueda offline en Reglas"
git commit -m "fix(server): corrige race condition en migrate"
git commit -m "docs: actualiza ROADMAP con Ola 2 cerrada"
git commit -m "chore(deps): bump vite a 5.4.12"
```

## CHANGELOG

`CHANGELOG.md` se actualiza con cada ola cerrada. Mantiene el formato de [Keep a Changelog](https://keepachangelog.com/).
