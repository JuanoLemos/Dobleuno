# ADR-008: Modelo de datos del club (single-row, single-tenant)

| Campo | Valor |
|---|---|
| **Decisión** | La info del club vive en una **tabla `club_info` con una sola fila** (id=1 siempre). Single-tenant: un deploy = un club. Multi-club queda para Fase 2. |
| **Estado** | Accepted |
| **Fecha** | 2026-07-10 |
| **Supersedes** | N/A |
| **Superseded by** | N/A |
| **Impacto** | API simple (`GET /api/club` + `PUT /api/club` con requireAdmin). Migración `0002_club_info.sql`. Seed automático al primer GET si la fila no existe. |

## Contexto

Para la "home del club" necesitamos persistir:

- Nombre del club
- Descripción corta
- Dirección física
- Horarios
- Contacto (email, WhatsApp, Discord)
- Redes sociales (IG, FB, etc.)
- Quién editó por última vez

Tres alternativas de modelado:

1. **KV en la tabla `user`** — uno o varios usuarios "admin" cargan info del club en su perfil. ❌ Acopla info pública del club con un user específico.
2. **JSON en `app_settings` (key-value)** — flexible pero pierde type-safety. ❌ Drizzle ORM brilla con tablas tipadas.
3. **Tabla `club_info` single-row** — tipada, simple, escala bien. ✅

## Decisión

Tabla `club_info` con `id INTEGER PRIMARY KEY DEFAULT 1 NOT NULL`. Siempre una fila. Si no existe, el primer `GET /api/club` la siembra con placeholder `{ nombre: "Dobleuno", descripcion: "Club de TOW...", horarios: "Sábados 14–22hs" }`.

```sql
CREATE TABLE club_info (
  id integer PRIMARY KEY DEFAULT 1 NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  direccion text,
  horarios text,
  contacto_email text,
  contacto_whatsapp text,
  discord text,
  redes jsonb DEFAULT '{}',
  updated_by text REFERENCES user(id) ON DELETE SET NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);
```

`updated_by` apunta al user admin que hizo la última edición (auditoría). Sin cascade-delete: si se borra el admin, queda `null` y se sigue editando.

## API

- `GET /api/club` — público, devuelve la fila (sembrando si no existe).
- `PUT /api/club` — requiere `requireAdmin`. Body validado con Zod. Devuelve la fila actualizada.

## Consecuencias

### Positivas

- Type-safety con Drizzle (tipos `ClubInfoRow`, `NewClubInfoRow`).
- Migración trivial (1 tabla).
- Auditoría básica vía `updated_by`.

### Negativas

- Single-tenant: cada deploy es un club. Si Juano quiere hostear 3 clubes, hay que refactorizar a multi-tenant (FK `club_id` en todas las tablas). **Diferido a Fase 2**.
- Sin versionado: si el admin rompe algo, no hay vuelta atrás. **Aceptable** porque PUT es atómico y reversible (volvés a poner el valor anterior).

## Reversibilidad

Para ir a multi-club (Fase 2):

1. Agregar columna `club_id` a todas las tablas (`lists`, `battles`, `club_info` → múltiples filas).
2. Refactor de la API para tomar `club_id` del usuario logueado.
3. Seed inicial = el club "default" del deploy.

Costo estimado: 2-3 días si surge la necesidad.