# MECANICA-CALIDAD — Estándares de calidad documental v1.3

Define el formato, estilo y reglas de calidad para todos los documentos y templates Diligencia.

---

## 1. Estándar ROADMAP

### Formato de tabla

| ID | Item | Prioridad | Estado | Depende de |
|----|------|-----------|--------|------------|
| R01 | Título del item | P2 | 🔴 Pendiente | — |

### Reglas

- **IDs**: secuencia `R01`, `R02`, `R03`... Nunca reusar IDs de items completados.
- **Prioridad**: `P1` (crítico/milestone), `P2` (feature), `P3` (nice to have).
- **Secciones fijas**: `## Ahora (Now)`, `## Siguiente (Next)`, `## Futuro (Later)`, `## Completado`.
- **Máximo**: 3 items en Ahora. Sin límite en las demás secciones.
- **Dependencia**: opcional — ID de otro item que bloquea al actual.
- **Estados**: 🔴 Pendiente / 🟡 En progreso / 🧪 En verificación / ✅ Completado / ❌ Bloqueado / 🗑️ Deprecado.
- **Migración**: al completar, mover a Completado **conservando el ID**: `| ID | Item | vX.Y.Z |`.
  El ID no se descarta al completar — otros ítems lo citan en su columna "Depende de", y los
  commits, walkthroughs y ADRs lo referencian. Descartarlo convierte esas referencias en
  citas colgadas de forma garantizada (detectado en el propio ROADMAP de Diligencia: 9 IDs
  citados sin fila resoluble, todos por este motivo).
- **Los IDs no se reciclan.** Un ID pertenece a un ítem para siempre, aunque el ítem se
  deprecue o se descarte.
- **🧪 En verificación**: el trabajo está hecho pero falta cerrar la Definición de Hecho (§6). Un item **no pasa a ✅ Completado salteando este estado** si el DoD tiene ítems abiertos.

### Secciones

| Sección | Contenido |
|---|---|
| Ahora | Hasta 3 items activos. Solo lo que se está haciendo AHORA. |
| Siguiente | Items priorizados para después de Ahora. |
| Futuro | Ideas sin fecha estimada. |
| Completado | Items terminados. Cada versión tiene su bloque. |

## 2. Estándar de documentos

### Header

```
# NOMBRE — Descripción vX.Y.Z
```

- Primera línea: `# ` + nombre documento + ` — ` + descripción breve + ` vX.Y.Z`
- Fecha de última actualización en metadata (debajo del header si aplica)

### Catálogo (INDEX)

- Todos los documentos listados en INDEX.md con versión y fecha.
- INDEX se organiza por tipo: Docs críticos, Guías, Mecánicas, ADRs.

### Cross-references

- Al final de cada documento: `## Archivos relacionados` con lista de referencias.
- Links relativos entre docs (ej: `MECANICA-CBP.md`, no `doc/mecanicas/MECANICA-CBP.md` a menos que esté en otra sección).

### Fechas

- Formato ISO 8601: `YYYY-MM-DD`.
- Toda edición de un documento actualiza su fecha en INDEX.md.

## 3. Template conventions

> **Solo aplica al repo de Diligencia.** Esta sección describe cómo se escriben los templates
> de `~/.claude/templates/diligencia-doc-base/`. En un proyecto adaptado no hay nada que hacer
> con ella: los placeholders ya fueron reemplazados por `/adaptar` durante la adaptación.
> Las secciones §1, §2, §4, §5 y §6 sí aplican a todo proyecto.

### Placeholders

| Placeholder | Uso |
|---|---|
| `<NOMBRE_DEL_PROYECTO>` | Nombre del proyecto |
| `<FECHA>` | Fecha de creación/adaptación |
| `<AUTOR>` | Autor o mantenedor |
| `<AÑO>` | Año actual |
| `<TITULAR>` | Copyright holder |

- Los placeholders se reemplazan durante `/adaptar` Flujo A.
- NO hardcodear versiones de metodología en templates (solo en archivos reales).

### ADAPTAR comments

```markdown
<!-- ADAPTAR: instrucción para el agente al adaptar el template -->
```

Estos comentarios guían al agente `/adaptar` sobre qué reemplazar o personalizar en cada template.

## 4. Estilo markdown

- Tablas con columnas alineadas (`|---|---|---|`).
- Code blocks con triple backtick + lenguaje (````powershell`, ````json`, ````bash`).
- Links relativos entre archivos del proyecto.
- NO usar rutas absolutas (`C:\...`, `/home/...`) — usar variables de ruta (`$GUIAS`, `$MECANICAS`).
- Separadores `---` entre secciones principales.
- Versiones en headers de archivo, no en el cuerpo.

## 5. Autocheck de calidad

Cada documento debería cumplir:

- [ ] Header con nombre + descripción + versión (`# NOMBRE — Descripción vX.Y.Z`)
- [ ] INDEX: documento catalogado con versión y fecha
- [ ] Fecha en ISO 8601 (`YYYY-MM-DD`)
- [ ] Cross-references al final (`## Archivos relacionados`)
- [ ] Tablas con alineación de columnas
- [ ] Sin rutas absolutas (usar variables `$`)
- [ ] Sin hardcodeo de versiones de metodología (solo versión del documento)
- [ ] ADAPTAR comments si aplica (templates)

## 6. Definición de Hecho (DoD)

Un item del ROADMAP pasa a ✅ Completado **solo cuando cumple todos los puntos que apliquen**.
Sin esto, "completado" significa cosas distintas según quién lo marque, y el ROADMAP deja de
ser confiable como fuente de estado.

### DoD base (todo proyecto Diligencia)

- [ ] Hace lo que dice el item del ROADMAP (no una versión recortada sin avisar)
- [ ] `CHANGELOG.md` tiene la entrada correspondiente
- [ ] `INDEX.md` refleja los archivos nuevos/modificados con su versión y fecha
- [ ] Si tocó el **shell** de la metodología (comandos globales, mecánicas, reglas R-*): versión bumpeada según **R6**
- [ ] Walkthrough de la sesión en `doc/arch/walkthrough/` + línea en `doc/arch/bitacora.md`
- [ ] Sin bugs **P1** abiertos en `doc/arch/bugs.md` atribuibles a este item
- [ ] Estado actualizado en `ROADMAP.md` (y movido a Completado con su versión)

### DoD extendido (proyectos con código)

Los 7 de arriba, más:

- [ ] La feature está **aislada y es desactivable** sin romper otros módulos
- [ ] Tests del proyecto en verde (`$TESTING`)
- [ ] Si hubo cambio de esquema de datos: migración versionada y documentada
- [ ] Verificación manual registrada en `$UX_CHECK` si tocó interfaz

> Diligencia (el proyecto) usa solo el DoD base: es Markdown puro, sin runtime ni tests.

### Cuándo NO aplica

Correcciones triviales sin decisión de diseño: typos, formato, links rotos, sincronización de
fechas. Estas no pasan por 🧪 ni generan walkthrough — van directo a commit.

### Quién lo verifica

`/CBP` durante Meta-PLAN: al detectar items en 🧪 En verificación, corre el checklist y reporta
qué falta antes de permitir el pase a ✅. No lo bloquea — lo informa y el usuario decide (R79.2).

## Archivos relacionados
- `templates/doc-base/ROADMAP.md` — template estándar de ROADMAP
- `GUIA_DE_BUENAS_PRACTICAS.md §11` — referencia a calidad documental
- `MECANICA-DOCUMENTAL.md` — motor documental del sistema
- `MECANICA-LOCK.md` — manifiesto de sincronización con el template
- `MECANICA-CBP.md` — orquestador que verifica el DoD y genera walkthroughs
