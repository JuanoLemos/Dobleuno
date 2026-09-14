# Dobleuno — Mapa de módulos

> Fuente de verdad sobre **qué ve el usuario y qué hace cada cosa**. Complementa `ROADMAP.md` (técnico) y `plan/PLAN-OLEADAS.md` (brief ejecutivo). Este doc describe el producto.
>
> Última actualización: 2026-07-10 — creado tras replanificación con usuario. Cierra el gap entre "Ola 7.1 cerrada" (técnico) y "qué viene ahora" (producto).

## TL;DR

Dobleuno = **un solo sitio** con tabs/módulos. La landing pública introduce el club. La app logueada expone los módulos. El portal Astro queda como anexo público/SEO hasta migrar todo a React.

```
┌─────────────────────────────────────────────────┐
│  Landing pública (/)                            │
│  - Nombre + info del club                       │
│  - CTA Ingresá / Registrate                     │
├─────────────────────────────────────────────────┤
│  App logueada — shell con tabs                  │
│  ┌──────┬──────┬──────┬─────────┐               │
│  │ Codex│Ejér- │Mesas │Crónicas │  ← módulos    │
│  │      │citos │      │         │               │
│  └──────┴──────┴──────┴─────────┘               │
└─────────────────────────────────────────────────┘
```

## Módulos visibles

| # | Módulo | Tab label | Estado | Stack | Descripción corta |
|---|---|---|---|---|---|
| 1 | **Codex** (reglamento) | Codex | ✅ Funciona en `portal/`. Pendiente migrar a app | Astro 7 → React (futuro) | Reglas especiales e items mágicos traducidos al español rioplatense. Búsqueda, navegación por fase, impresión. |
| 2 | **Armybuilder** (listas) | Ejércitos | ✅ Funciona en `apps/web/` | React 18 + Zustand + Dexie | Construir listas de ejército. Fork de nthiebes/old-world-builder. Validación de composición, save/load. |
| 3 | **Home del club** (info básica) | (landing `/`) | 🆕 Falta | React + Admin-editable | Nombre, dirección, horarios, contacto, redes. Una sola pantalla, configurable. |
| 4 | **Calendar multi-mesa** | Mesas | ✅ Ola 9 (v1.0.0) | React + Express API | Admin publica sesiones. Jugadores reservan mesa específica + fecha + formato (2000/2500/Open). Anti-doble-booking por user y por cupo. |
| 5 | **Galería + AI battle stories** | Crónicas | ✅ Ola 10 (v1.1.0) | React + disco local + DeepSeek | Por cada batalla terminada, un relato generado con IA y anclado a lo que registró el tracker. Fotos de la partida, privadas o publicadas al club. |

## Decisiones arquitectónicas locked (sesión 2026-07-10)

### DA-1 — React app como single source of truth

**Decisión:** todo lo post-login vive en `apps/web/` (React). El portal Astro queda como anexo SEO.

**Por qué:**
- Auth compartido (ya implementado en app con better-auth). No duplicar sesión.
- Estado compartido (listas ↔ batallas ↔ calendar ↔ galería). Zustand ya está.
- UX de tabs es naturalmente SPA — sin recargas entre módulos.
- Un solo bundle, un solo deploy.

**Trade-off:** el portal Astro tiene mejor SEO out-of-the-box. Lo compensamos cuando crezca: SSR con Astro→React hydration o Next.js.

### DA-2 — Tabs con naming en español

- **Codex** (reglamento) — sin traducir, ya es nombre universal
- **Ejércitos** (armybuilder) — en español para el club
- **Mesas** (calendar)
- **Crónicas** (galería + stories)

Si más adelante agregamos módulos: Club (info del club como tab, no landing), Stats, Chat IA, etc.

### DA-3 — Calendar: modelo multi-mesa con reserva

**Entidades:**
- `mesa` (id, nombre, capacidad)
- `sesion` (id, mesaId, fecha, formato [2000/2500/Open], notas, adminUserId)
- `reserva` (id, sesionId, userId, ejercito, puntos, notas)

**Roles:**
- `admin` (miembro del club) — crea/edita mesas y sesiones
- `jugador` (logueado) — ve sesiones, reserva una mesa por sesión

**No-multi-club en MVP.** Un deploy = un club. Multi-club queda para Fase 2.

### DA-4 — IA battle stories: text-first, fotos enriquecen después

**Flujo:**
1. Batalla terminada → usuario pulsa "Generar story"
2. Modal con prompt editable (default: "Crónica épica medieval, tercera persona, 200 palabras")
3. Backend llama a DeepSeek con contexto:
   - Resultado de la batalla (quién ganó, puntos)
   - Turnos clave (carga exitosa, magia decisiva, etc.)
   - Metadata: ejércitos enfrentados, fecha, mesa
4. Story generado → guardado en `battle.story`
5. (Opcional) Subir fotos → segunda generación con input multimodal → historia enriquecida

**Por qué text-first:** las fotos son bonus, no requisito. El usuario puede tener batallas sin fotos (mesa del club, no todos sacan cámara). El story vale solo.

### DA-5 — Home del club: info básica, admin-editable

**Datos:**
- Nombre del club
- Dirección / ubicación
- Horarios (texto libre o estructura?)
- Contacto (mail, WhatsApp, Discord)
- Redes (IG, etc.)

**No construimos:** perfil de miembros, ranking interno, "estado del club". Eso es post-MVP si el club lo pide.

### DA-6 — Branding: kit ya generado, persistido en `apps/web/public/brand/`

- 3 escudos (`01-heraldic-dark`, `02-illuminated`, `03-cartography-engraved`)
- Hero backgrounds (`hero-cartografo`, `hero-codex`, `hero-armybuilder-dark`)
- Escena ambient (`scene-battle-council`)
- Tiles (`tile-iron-plate`, `tile-leather-tome`)

**Aplicado a:** portal home (Cartógrafo), portal /reglas (Codex), portal /sobre (escena), armybuilder login (mapa oscuro + iluminado), cards con textura (iron para listas/units, leather para items).

## Roadmap post-v0.8.0

| Ola | Nombre | Scope | Estimación |
|---|---|---|---|
| **8** | **Home del club + shell con tabs** | Landing pública con info básica + tabs funcionales | 2-3 días |
| **9** | **Calendar multi-mesa** | Modelo, API, UI admin + jugador, integración con listas del armybuilder | 3-4 días |
| **10** | **Galería + AI battle stories** | Upload fotos, generación de stories con DeepSeek, vista de crónicas | 3-4 días |
| **11** | **Migración Codex portal → app** | Portear páginas Astro a React. Mantener SEO con SSG si posible | 2-3 días |
| **12** | **Polish + deploy consolidado** | Un solo deploy (app + portal + landing en un proceso o dos coordinados) | 2-3 días |

**Después (Fase 2+, no en scope):**
- Stats / analytics del club
- Notificaciones push (sesiones próximas)
- Multi-club (un deploy = varios clubes)
- Marketplace de listas (NO — software libre, no SaaS)
- Voice / AR / etc. (NO — scope original)

## Detalle por módulo

### Módulo 1 — Codex (reglamento)

**Estado:** ✅ Portal Astro funcional en `localhost:4321/reglas`. 0 reglas cargadas todavía (no corrimos `npm run rules:sync` con DeepSeek API key).

**Pendientes:**
- Ola 11: migrar a React
- Sincronizar KB real (requiere `DEEPSEEK_API_KEY` en `.env`)
- Agregar filtros (búsqueda por rareza en items, por categoría en reglas)

**Decisión:** mantener portal Astro como SEO hasta Ola 11. Las reglas son contenido estático ideal para indexar.

### Módulo 2 — Ejércitos (armybuilder)

**Estado:** ✅ Funciona en `apps/web/` (`localhost:5173/listas`). Fork de `JuanoLemos/old-world-builder` (basado en `nthiebes/old-world-builder`).

**Pendientes:**
- Integración con Calendar (cuando armes lista, opción "Reservar mesa para esta lista")
- Battle tracker con sync al calendario
- (Fase 2) Deck histórico de batallas por lista

**Decisión:** no tocar hasta Ola 9. Está estable, no romper.

### Módulo 3 — Home del club

**Scope Ola 8:**
- `apps/web/src/routes/Landing.tsx` con info del club (si no logueado)
- `apps/web/src/components/Club/ClubInfo.tsx` componente
- API: `GET /api/club` + `PUT /api/club` (admin)
- Storage: nueva tabla `club_info` (id=1 single row) o KV en DB

**Out of scope:**
- Multi-club
- Perfiles de miembros
- Estado del club (online/offline)

**Criterio de done:** landing `/` muestra nombre + dirección + horarios + contacto + redes + CTA "Ingresá".

### Módulo 4 — Mesas (calendar)

**Scope Ola 9:**
- `apps/server/src/routes/calendar.ts` con CRUD de mesa/sesion/reserva
- `apps/web/src/routes/Calendar.tsx` con vista grid (mesas × tiempo)
- `apps/web/src/routes/CalendarAdmin.tsx` para admin crear sesiones
- Roles: middleware `requireAdmin` para POST/PUT/DELETE
- UI: drag-and-drop o modal con datepicker

**Modelo de datos:**
```ts
type Mesa = { id: string; nombre: string; capacidad: 4 | 6 | 8; activa: boolean };
type Sesion = {
  id: string;
  mesaId: string;
  fecha: string;        // ISO
  formato: '2000' | '2500' | 'open';
  notas?: string;
  adminUserId: string;
};
type Reserva = {
  id: string;
  sesionId: string;
  userId: string;
  ejercito?: string;    // "Bretonia", "Empire" — o referencia a listId?
  puntos?: number;
  notas?: string;
};
```

**Criterio de done:** admin crea "Sábado 14hs, mesa 1, 2000pts", jugador ve y reserva, sin doble booking.

**Out of scope:**
- Pago /押金
- Notificaciones email
- Recurrencia automática (cada sábado). Admin publica cada vez.

### Módulo 5 — Crónicas (galería + stories)

**Entregado en Ola 10 (v1.1.0).** El naming quedó en español, como el resto del código de
producto desde Ola 9: `Cronicas.tsx`, `cronicas.ts`, tablas `cronicas` / `cronica_fotos`.

- Storage: disco local en `UPLOADS_DIR` (volumen `dobleuno-uploads`), S3 después
- `apps/server/src/routes/cronicas.ts` — CRUD + fotos + generar
- `apps/server/src/lib/{uploads,story-gen}.ts` — storage y pipeline del relato
- `apps/web/src/routes/{Cronicas,CronicaDetalle}.tsx` — galería y detalle

**Flujo:**
1. Usuario termina batalla → "Guardar batalla" → resultado persiste
2. Botón "Generar crónica" → modal con prompt default + editable
3. Backend: DeepSeek text-gen con contexto estructurado
4. Resultado: texto guardado en `battle.story`
5. Galería: lista de batallas con story (futuro: agrupar por club/mes)

**Fotos:**
- Upload en batalla terminada o después
- Tabla `cronica_fotos` (no `battle.photos`: el PATCH del tracker reescribe el jsonb entero y
  pisaría las fotos subidas en paralelo — ver ADR-010)
- Input multimodal con fotos: **depende de cambiar de modelo**, `deepseek-chat` no es multimodal

**Criterio de done:** batalla terminada → "Generar crónica" → story legible y coherente con el resultado.

**Out of scope:**
- Generación de imágenes (es solo text)
- Multi-usuario escribiendo crónica compartida
- Editor WYSIWYG (prompt editable en textarea simple)

## Estructura de archivos (post-Ola 8)

```
Dobleuno/
├── apps/
│   ├── web/                  # React app principal
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── Landing.tsx       # NUEVO — Ola 8
│   │   │   │   ├── Calendar.tsx      # NUEVO — Ola 9
│   │   │   │   ├── CalendarAdmin.tsx # NUEVO — Ola 9
│   │   │   │   ├── Chronicles.tsx    # NUEVO — Ola 10
│   │   │   │   └── ...
│   │   │   └── components/
│   │   │       ├── Club/             # NUEVO — Ola 8
│   │   │       └── shell/            # NUEVO — Ola 8 (TabShell, NavTabs)
│   │   └── public/brand/             # Brand kit ya generado
│   ├── server/               # Express
│   │   ├── src/routes/
│   │   │   ├── club.ts               # NUEVO — Ola 8
│   │   │   ├── calendar.ts           # NUEVO — Ola 9
│   │   │   ├── chronicles.ts         # NUEVO — Ola 10
│   │   │   └── ...
│   │   └── src/lib/
│   │       └── story-gen.ts          # NUEVO — Ola 10
│   └── ...
├── packages/
│   ├── ui/                   # Shared components (futuro — Ola 8 si da tiempo)
│   ├── shared/               # YA EXISTE — tipos compartidos
│   └── brand/                # Brand kit como imports TS (futuro)
├── portal/                   # Anexo SEO — se mantiene hasta Ola 11
├── scripts/
│   ├── translate-tow.ts      # YA EXISTE
│   ├── rules-sync.ts         # YA EXISTE
│   └── shortcuts/            # YA EXISTE
├── doc/
│   ├── MODULES.md            # ESTE DOC
│   ├── ROADMAP.md            # Actualizar con olas 8-12
│   ├── plan/PLAN-OLEADAS.md  # Historial técnico
│   ├── arch/                 # ADRs (futuro ADR para DA-1, DA-2)
│   └── ...
└── README.md
```

## Naming final

| Concepto | Nombre en producto |
|---|---|
| App | Dobleuno |
| Tab 1 | Codex |
| Tab 2 | Ejércitos |
| Tab 3 | Mesas |
| Tab 4 | Crónicas |
| Landing | (sin label — es el home) |
| Sigil | "2·1" en heater shield (3 variantes en brand kit) |
| Tipografía | DM Serif Display (titulares), Outfit (UI), JetBrains Mono (código) |

## Pendientes / Incógnitas abiertas

- [x] Storage para fotos (Ola 10): disco local con volumen propio. S3 queda para después (ADR-010)
- [ ] Hosting unificado (Ola 12): un deploy o dos coordinados
- [x] Tono del story IA (Ola 10): selector de tres — cronista (default), épico, parte de batalla
- [ ] ¿Calendar tiene recurrencia automática? (NO en MVP — admin publica cada vez)
- [ ] ¿Fotos requieren moderación? (NO en MVP — club chico, confianza)
- [ ] ¿Multi-idioma del club? (NO en MVP — español rioplatense)
- [ ] ¿Brand kit se importa como módulo TS o queda como assets? (deuda técnica menor)

## Referencias

- `ROADMAP.md` — estado técnico (olas 0–7.1 cerradas, 8+ por arrancar)
- `plan/PLAN-OLEADAS.md` — brief ejecutivo de olas 0.5–7
- `arch/ADRs/` — decisiones técnicas cerradas (DA-1 a DA-6 se archivan como ADR cuando arranquemos Ola 8)
- `CHANGELOG.md` — bitácora por versión
- `Sources.md` — atribución tow.whfb.app