# ADR-010 — Crónicas: modelo de datos, storage y generación

**Estado:** Aceptado
**Fecha:** 2026-09-14
**Ola:** 10 (Crónicas)

## Contexto

Una partida terminada deja un `BattleState` con unidades, bajas, turnos y un log de eventos. Hoy
eso muere en la base: nadie lo vuelve a mirar. Crónicas lo convierte en un relato legible más una
galería de fotos de la mesa.

Decisiones a lockear:

- ¿La crónica es una tabla propia o campos dentro del jsonb `battles.data`?
- ¿Dónde viven las fotos y cómo se sirven?
- ¿Quién ve una crónica?
- ¿Cómo se evita que el relato invente cosas que no pasaron?
- ¿Cómo se frena el gasto de tokens?

Es el primer módulo del proyecto que escribe archivos a disco y el segundo que llama al LLM.

## Decisión

### Entidades

```
cronica       → el relato de una batalla terminada + metadata de generación.
                UNIQUE(battle_id): una crónica por batalla.
cronica_foto  → una foto de esa partida. Archivo en disco + metadata en la fila.
```

La crónica **puede existir sin texto**: se crea al subir la primera foto o al abrir el modal de
generación, lo que pase primero. `texto = NULL` significa "todavía sin generar", no "vacía".

### Tablas propias, no campos en `battles.data`

`battles.data` es un `jsonb` con el `BattleState` entero, y el `PATCH` del tracker lo reescribe
completo (read-modify-write). Guardar ahí las fotos significa que, si el jugador tiene la batalla
abierta en el tracker mientras sube fotos desde otra pantalla — el escenario normal: se saca fotos
*durante* la partida —, el `PATCH` del tracker llega con su copia del state y pisa el array.

Además: la galería tendría que escanear `jsonb_array_elements(data->'photos')` sin índice, sobre
un `BattleState` que incluye el log completo de cada partida; y las fotos necesitan metadata por
fila (mime, bytes, dimensiones, orden, epígrafe) que un `string[]` no aguanta.

### Visibilidad elegida por el autor, default privada

`visibilidad: 'privada' | 'publica'`. Privada = solo el autor. Pública = cualquier socio logueado
la ve en el feed del club. El default es privada: publicar es una acción deliberada.

El feed nunca expone el email del autor, solo `user.name` — mismo criterio que las reservas en
ADR-009.

### Tono como enum cerrado

`tono: 'cronista' | 'epico' | 'sobrio'`. El cliente manda el enum, nunca texto libre. La
preferencia de estilo en lenguaje natural va aparte, en `prompt_usuario`, capada a 500 caracteres
y marcada en el prompt como preferencia y no como instrucción de sistema.

### Storage: disco local, volumen propio

Las fotos van a `UPLOADS_DIR/cronicas/<uuid>.<ext>`, con default `<repo-root>/uploads/` y, en
Docker, el volumen `dobleuno-uploads` montado en `/app/uploads`.

**Volumen separado de `dobleuno-kbdata`**, aunque ya exista y sea tentador reusarlo: la KB es
cache regenerable (`npm run kb:rebuild` la reconstruye) y las fotos son dato de usuario
irremplazable. Mezclarlos garantiza que alguien, en algún momento, borre el volumen para forzar un
re-sync de la KB y se lleve puestas las fotos del club.

`filename` guarda **solo el nombre del archivo**, no la ruta ni la URL. El directorio sale de
`UPLOADS_DIR` y la URL se arma al serializar. Mover el storage no obliga a reescribir filas.

### Fotos servidas por URL-capability

`express.static` bajo `/api/media/cronicas`. El nombre del archivo es un UUID v4 no adivinable; la
autorización se aplica a **qué URLs ves** (el `GET /api/cronicas` filtra por dueño y visibilidad),
no a los bytes.

La alternativa —un endpoint autenticado que streamee el archivo— rompe en desarrollo: el cliente
corre en `:5173` y apunta a `VITE_API_URL` en `:3000` sin proxy, y un `<img src>` no manda cookies
cross-origin. Sería un "las fotos no cargan en dev pero sí en prod" permanente.

Es el mismo modelo de amenaza que una presigned URL de S3, que es adonde esto migra después.

El path va bajo `/api/` y no en `/media` porque el SPA fallback del server es
`app.get(/^(?!\/api).*/)`: cualquier ruta fuera de `/api` termina devolviendo `index.html` si
cambia el orden de los `app.use`.

### El relato se ancla a datos reales

El prompt obliga al modelo a anclar lo que afirma con marcadores `[u:N]` (unidad) y `[h:N]` (hito
del log). El server los parsea con regex, **valida cada índice contra el estado real de la batalla
y descarta los que no correspondan**, limpiándolos del texto. Es el mismo principio que
`extractCitations()` en el oráculo (ADR-005): el modelo emite marcadores estructurados, el server
nunca confía en que referenció algo que existe.

Encima de eso: lista blanca de nombres de unidad (si menciona una que no peleó, queda un warning
visible), chequeo de longitud, y un reintento si hay más de dos alucinaciones. Si reincide, se
guarda degradado con el aviso — no se descarta: el autor ya esperó y ya se gastaron los tokens.

### Sin contexto no se llama al LLM

Si la batalla no está `finished`, o no tiene log ni unidades, el endpoint devuelve 422 sin
consultar al modelo. Mismo criterio que el oráculo cuando el retrieval vuelve vacío: no se genera
ficción pura.

**Tope de generaciones**: 5 por crónica (columna `generaciones`) más 30 segundos de cooldown por
usuario. Es el segundo endpoint LLM del repo y el primero con freno — `/api/ask` no tiene ninguno,
que es deuda conocida.

## Trade-offs

- **Tabla propia** vs jsonb: más superficie (dos tablas, una migración, un router) a cambio de
  escrituras concurrentes seguras y una galería consultable con índice.
- **Una crónica por batalla** vs varias: `UNIQUE(battle_id)` simplifica todo el flujo. Si algún día
  se quiere "varias versiones del relato", hay que levantar el constraint y decidir cuál es la
  canónica.
- **Downscale en el cliente** vs `sharp` en el server: evita meter libvips en una imagen alpine, y
  la foto sale del celular pesando ~300 KB en vez de 4 MB — que importa, porque se saca en la mesa
  del club con datos móviles. A cambio, dependemos del canvas del browser; el límite de 8 MB del
  server queda como red de seguridad si el downscale falla.
- **Capability URLs** vs endpoint autenticado: simple, cacheable y alineado con el destino (S3), a
  costa de que el secreto sea el link.

## Consecuencias

- **Positivas**: las fotos y el relato sobreviven a cualquier reescritura del `BattleState`; la
  galería es una query con índice; el relato no puede citar unidades que no existieron; el gasto
  de tokens tiene techo.
- **Negativas**, todas conocidas y aceptadas:
  - **Las fotos son secretas-por-oscuridad**: quien tenga el link, ve la foto, aunque la crónica
    sea privada.
  - **El `ON DELETE CASCADE` borra filas, no archivos**. Borrar una crónica por su endpoint sí
    borra los archivos; borrar la batalla de la que cuelga deja huérfanos en disco hasta que
    exista un `uploads:gc`.
  - **Sin el volumen montado no hay fotos**: un deploy que se olvide de declarar
    `dobleuno-uploads` pierde las imágenes en el próximo `docker compose down`.

## Decisiones diferidas (post-MVP)

- S3 / presigned URLs (el modelo de seguridad ya está alineado; cambia el origen, no la postura).
- Thumbnails en el server.
- Moderación de fotos — decidido que no en MVP: club chico, confianza.
- Epígrafes por foto y reordenar arrastrando.
- Editar el texto generado a mano.
- `uploads:gc` para archivos huérfanos.
- **Input multimodal** (mandarle las fotos al modelo para que enriquezcan el relato): `doc/MODULES.md`
  lo menciona como "segunda generación", pero `deepseek-chat` **no es multimodal**. Depende de
  cambiar de proveedor o de modelo, no es una feature pendiente de codear.

## Archivos relacionados

- `apps/server/src/db/schema/cronicas.ts` — las dos tablas
- `apps/server/src/db/migrations/0004_melted_gravity.sql` — la migración
- `packages/shared/src/types/cronica.ts` — tipos que cruzan cliente ↔ server
- `doc/arch/ADR-005-llm-provider.md` — proveedor LLM y el patrón de citas validadas
- `doc/arch/ADR-009-calendar-data-model.md` — precedente de modelo single-tenant
