# Crons

Tareas programadas del proyecto. Cada cron es una tarea que corre automaticamente.

**Crear con:** `mavis cron create`

## Estructura

Este directorio contiene archivos `.md` con la definicion de cada cron. Cada cron tiene:

- **Nombre**: identificador unico
- **Schedule**: cuando corre (formato cron, ej: `0 3 * * *` = todos los dias a las 3 AM)
- **Accion**: que hace
- **Timeout**: cuanto tiempo maximo puede correr

## Ejemplos comunes

- **nightly-backup**: backup de DB todas las noches
- **weekly-health-check**: corre `/doctor` una vez por semana
- **kb-sync**: re-sincroniza la base de conocimiento (si aplica)
