# Hooks

Hooks del proyecto. Cada hook es una puerta que se valida antes/despues de una accion.

**Crear con:** `mavis hook create`

## Estructura

Este directorio contiene archivos `.md` con la definicion de cada hook. Cada hook tiene:

- **Nombre**: identificador unico
- **Trigger**: que evento lo dispara (pre-commit, post-edit, etc.)
- **Accion**: que hace cuando se gatilla
- **Cancelar si falla**: si la accion falla, ¿bloquea la operacion original?

## Ejemplos comunes

- **pre-commit-validate**: corre lint y tests antes de commitear
- **secret-guard**: scanea el diff por secrets antes de commitear
- **doc-drift**: detecta si hubo cambios de API/UX sin doc update
