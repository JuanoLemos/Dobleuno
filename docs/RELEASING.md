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
| `1.0.0` | ⏳ Próximo | MVP público |

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
3. Tag git: `git tag -a v0.X.0 -m "Release v0.X.0"`
4. Push tag: `git push origin v0.X.0`
5. CI genera release automáticamente (futuro)

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
