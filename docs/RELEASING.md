# Versioning

Dobleuno usa [Semantic Versioning 2.0.0](https://semver.org/). El versionado se aplica a todo el monorepo (cliente + server + shared).

## Estado actual

| Versión | Estado | Notas |
|---|---|---|
| `0.0.0` | ✅ Cerrado | Repo inicial, decisiones + plan |
| `0.1.0` | ✅ Cerrado | Ola 0.5: prompt v0.1 con DeepSeek |
| `0.2.0` | ✅ Cerrado | Ola 1: Foundation (monorepo, PWA, auth) |
| `0.3.0` | ⏳ Próximo | Ola 2: KB local + mirror tow.whfb.app |
| `0.4.0` | ⏳ | Ola 3: List builder |
| `0.5.0` | ⏳ | Ola 4: Battle tracker |
| `0.6.0` | ⏳ | Ola 5: Rules oracle (RAG) |
| `0.7.0` | ⏳ | Ola 6: Polish + deploy |
| `1.0.0` | ⏳ | MVP público |

## Esquema

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (1.x): cambios incompatibles. Reservado para MVP público.
- **MINOR** (0.X): nuevas features. Cada ola es un minor bump.
- **PATCH** (0.X.Y): bugfixes, mejoras de performance, cambios sin impacto en la API.

Pre-1.0 (0.x): cualquier bump puede traer cambios incompatibles. Estamos en desarrollo activo.

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
