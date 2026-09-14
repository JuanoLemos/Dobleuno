# ADR-009 — Calendar Data Model (Mesas / Sesiones / Reservas)

**Estado:** Aceptado
**Fecha:** 2026-07-10
**Ola:** 9 (Mesas)

## Contexto

El club necesita coordinar sesiones de juego: el admin publica "Sábado 14hs, mesa 1, 2000 pts", los jugadores se anotan, y no debería haber doble booking ni cupo超额.

Decisiones a locked:
- ¿Qué entidad representa "el lugar donde jugamos"?
- ¿Cómo se relacionan mesa, sesión y reserva?
- ¿Multi-club en MVP?
- ¿Capacidad por mesa o por sesión?
- ¿Qué permisos tiene cada rol?

## Decisión

### Entidades

```
Mesa    → lugar físico (con capacidad). Soft delete.
Sesión  → fecha concreta en una mesa (con formato y notas). Hard delete cascade.
Reserva → user anotado para una sesión. UNIQUE(sesion, user) anti-doble-booking.
```

### Single-tenant

Un deploy = un club. No hay `club_id` en las tablas. Multi-club queda para Fase 2.

### Capacidad por mesa (no por sesión)

`mesa.capacidad: 2 | 4 | 6 | 8` (enum fijo). La sesión hereda la capacidad. Más simple: el admin cambia la capacidad de la mesa si necesita más cupos.

### Reserva con `listId` opcional

`reserva.listId?` apunta a una `list` del armybuilder si el user tiene lista guardada. Si no, puede reservar igual con `notas` en texto libre. Esto integra el calendar con el armybuilder sin romper usuarios que aún no armaron lista.

### Permisos

| Endpoint | Público | Auth | Admin |
|---|---|---|---|
| `GET /api/mesas` | ✅ | ✅ | ✅ |
| `POST /api/mesas` | — | — | ✅ |
| `PUT /api/mesas/:id` | — | — | ✅ |
| `DELETE /api/mesas/:id` (soft) | — | — | ✅ |
| `GET /api/sesiones` | ✅ | ✅ | ✅ |
| `GET /api/sesiones/:id` | ✅ | ✅ | ✅ |
| `POST /api/sesiones` | — | — | ✅ |
| `PUT /api/sesiones/:id` | — | — | ✅ |
| `DELETE /api/sesiones/:id` (cascade) | — | — | ✅ |
| `GET /api/sesiones/:id/reservas` | ✅ (sin emails) | ✅ | ✅ |
| `POST /api/sesiones/:id/reservar` | — | ✅ | ✅ |
| `DELETE /api/sesiones/:id/reservar/:rid` | — | dueño o admin | ✅ |
| `GET /api/mis-reservas` | — | ✅ | ✅ |

GET público de sesiones y reservas anima a registrarse para reservar (no exponemos emails).

### Anti-doble-booking

Tres capas (defense in depth):

1. **DB UNIQUE constraint**: `UNIQUE(sesion_id, user_id)` en `reservas`.
2. **Validación de capacidad**: count(reservas) vs mesa.capacidad antes de insertar.
3. **UX**: el botón "Reservar" se deshabilita si el user ya tiene reserva o la mesa está llena.

### Soft vs hard delete

- **Mesas**: soft delete (`activa=false`). Las sesiones pasadas no se tocan.
- **Sesiones**: hard delete + cascade a reservas. Si el admin borra una sesión futura con reservas, se pierden las anotaciones (decisión consciente — el admin sabrá lo que hace).

### Timezone

`sesiones.fecha` es `timestamp with time zone`. Server guarda en UTC. UI convierte a `America/Buenos_Aires` con `Intl.DateTimeFormat({ timeZone: 'America/Buenos_Aires' })`. El frontend usa `<input type="datetime-local">` que produce strings ISO con offset.

### Datepicker

HTML5 `<input type="datetime-local">` sin librería externa. Mobile-first, sin bundle extra.

## Trade-offs

- **Enum fijo de capacidad (2/4/6/8)** vs `number` libre: preferimos enum porque fuerza valores sensatos y permite UI con select. Si el club necesita 10 o 12 jugadores por mesa, hay que agregar al enum.
- **Reserva con listId opcional** vs siempre requerido: preferimos opcional porque no todos los jugadores arman lista antes de reservar. Los que sí lo hacen, su reserva queda anclada al battle tracker (Fase 2).
- **Hard delete de sesiones con cascade** vs soft delete: preferimos hard porque el admin es responsable y el club es chico. Si borra "Sábado 14hs" por error, lo republica.
- **GET público sin auth** vs todo requiere login: preferimos público porque la landing ya muestra info del club. Es natural que el calendar sea público también.

## Consecuencias

- **Positivas**: modelo simple, GET público anima a registrarse, anti-doble-booking robusto en DB.
- **Negativas**: single-tenant significa migrar todo si el día de mañana queremos multi-club. La integración list↔reserva requiere que el armybuilder esté vivo (lo está desde Ola 3).

## Decisiones diferidas (post-MVP)

- Multi-club (un deploy = varios clubes).
- Notificaciones push de sesiones próximas.
- Recurrencia automática (admin publica cada vez).
- Pago /押金 de la plaza.
- Historial de batallas atado a la reserva (Fase 2 — battle tracker).