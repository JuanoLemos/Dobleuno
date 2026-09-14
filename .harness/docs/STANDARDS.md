# Project Standards

Estandares del proyecto. Customiza este archivo con las convenciones especificas.

## Idioma

- Respuestas del agente: espanol
- Documentacion: espanol
- Commits: ingles (conventional commits)
- Codigo: comentarios en espanol, identificadores en ingles

## Code style

- TypeScript strict mode
- ESLint + Prettier (configuracion en raiz)
- 2 espacios de indentacion
- Single quotes en TS/JS
- Trailing comma donde aplica
- Ver `package.json` y `eslint.config.*` para detalle

## Git workflow

- Branch desde `main`: `feat/<nombre>`, `fix/<nombre>`, `chore/<nombre>`
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- PR con descripcion clara, link a issue si aplica
- Squash merge a main
- Tags semver en releases

## Testing

- Tests por feature nueva (no se mergea feature sin test)
- Cobertura objetivo: 80%+
- Test runner: ver `package.json`
- Tests unitarios al lado del codigo (`*.test.ts`) o en `__tests__/`
- E2E: si aplica, en `e2e/` o `tests/e2e/`

## Seguridad

- `.env` en `.gitignore` (nunca commitear)
- Secrets en variables de entorno
- Validacion de input en bordes (API entrypoints)
- Auth check en endpoints protegidos
- No loggear PII ni secrets

## Performance

- No meter deps pesadas sin justificacion
- Memoizar computos caros
- Lazy load de modulos grandes
- Indices en DB para queries frecuentes

## Deprecacion

- Marcar APIs deprecadas con `@deprecated` JSDoc
- No borrar features sin deprecation period de 1 release
- Mover archivos obsoletos a `.old/` (no `rm`)
