# MECANICA-LOCK — Manifiestos de sincronización por huella v1.2.0

Define cómo se detecta, con certeza y sin depender de la memoria de nadie, que algo se
desincronizó. Usa el mismo instrumento en dos lugares distintos:

| Manifiesto | Dónde vive | Qué vigila | Sección |
|---|---|---|---|
| `diligencia-lock.json` | Raíz de cada proyecto adaptado | Las copias locales de mecánicas y guías canónicas vs. el template | §1–§6 |
| `shell-lock.json` | `~/.claude/` (global) | Los comandos, agentes y skills de Diligencia vs. la última versión publicada | §7 |

Son el mismo truco — una huella digital tomada en un momento conocido — aplicado a dos
problemas distintos.

---

## 1. El problema que resuelve

`/adaptar` copia mecánicas y guías canónicas desde el template a cada proyecto. Después de
eso, dos cosas pueden pasar por separado:

- El **template avanza** (Diligencia mejora una mecánica).
- El **proyecto customiza** su copia local (override intencional).

Sin registro, `/adaptar` no puede distinguir un caso del otro: comparar solo la versión del
header falla si alguien editó el contenido sin tocar el header, y falla al revés si el
template subió de versión sin cambios reales. El resultado es que se pisan customizaciones
o se conservan archivos viejos, en silencio.

**Analogía:** es la diferencia entre "este documento dice v1.0 igual que el original, así que
asumo que es idéntico" y "le saqué una huella digital cuando lo copié, así que sé exactamente
si alguien lo tocó".

## 2. El archivo `diligencia-lock.json`

Vive en la **raíz de cada proyecto adaptado**. Registra, por archivo, **dos** huellas —
la del archivo del proyecto y la del template en el momento del registro — no una sola.

```json
{
  "diligencia_version": "4.2.2",
  "generated": "2026-08-23",
  "generator": "/adaptar",
  "files": {
    "doc/mecanicas/MECANICA-AUDIO.md": {
      "sha256": "3f8a2c...",
      "template_sha256": "3f8a2c...",
      "origen": "template",
      "template_version": "1.0.0",
      "synced_at": "2026-08-14"
    },
    "doc/guias/identidad.md": {
      "sha256": "9b1e40...",
      "template_sha256": "aa11bb...",
      "origen": "override",
      "motivo": "placeholder [Nombre del Sistema] reemplazado por /adaptar Flujo A",
      "template_version": "1.0",
      "synced_at": "2026-08-14"
    }
  }
}
```

| Campo | Qué guarda |
|---|---|
| `sha256` | Huella del archivo **del proyecto** en el momento del registro |
| `template_sha256` | Huella del archivo **del template** en ese mismo momento — la pieza que faltaba en v1.0.0 |
| `origen` | `template` (idéntico al template al registrar) u `override` (ya divergía al registrar) |
| `motivo` | Solo si `origen: override` — por qué divergía (placeholder, customización, versión más nueva…) |

**Regla de propiedad:** lo que está en `files` viene del template y es candidato a sincronizarse.
**Todo lo demás es del proyecto** y `/adaptar` no lo toca nunca — no hace falta declararlo.

> Diligencia (el proyecto) **no tiene** `diligencia-lock.json`: es la fuente de verdad, no
> consume del template. El lock existe solo en proyectos adaptados.

## 3. Cómo se calcula una huella

```bash
sha256sum "doc/mecanicas/MECANICA-AUDIO.md" | cut -d' ' -f1
```

Disponible en Git Bash sin instalar nada. No requiere Node, Python ni runtime del proyecto —
la metodología sigue siendo Markdown puro.

## 4. Comparación de cuatro vías

> **v1.1.0 — corrige un bug de diseño de v1.0.0.** La versión original comparaba
> `lock.sha256 vs actual vs template_actual` ("tres vías") y asumía que `lock == actual`
> significa "nadie tocó el local". Eso es falso en bootstrap (§5): el lock se siembra con el
> estado *actual* del proyecto, así que `lock == actual` es cierto por construcción, no prueba
> nada. En un proyecto con `identidad.md`/`MANDATO.md` ya personalizados (placeholder
> reemplazado por `/adaptar` Flujo A — el caso normal), eso llevaba a proponer "el template
> avanzó, actualizar" y pisar la personalización. Detectado en Nemesis, 2026-08-23 (mutación
> M2) — casi revierte `identidad.md`, `MANDATO.md` y una `MECANICA-AUDIO.md` más nueva que la
> del template.

Ahora se comparan cuatro valores: el `sha256` del lock, el `sha256` actual del proyecto, el
`template_sha256` que el lock guardó al registrar, y el `sha256` actual del template:

| actual vs lock.sha256 | template actual vs lock.template_sha256 | `origen` | Significado | Acción |
|---|---|---|---|---|
| = | = | — | Nada cambió desde el registro | Nada |
| = | ≠ | `template` | Nadie tocó el local, el template avanzó desde que se registró | **Actualizar** (seguro) |
| = | ≠ | `override` | Nadie tocó el local (que ya era distinto a propósito), Y el template también avanzó | **Informar**: "el template evolucionó, tu override sigue vigente — revisar si conviene tomar lo nuevo" (no forzar) |
| ≠ | = | — | El proyecto tocó su copia, el template no cambió | **Conservar local** — actualizar `sha256` y `origen: override` en el lock |
| ≠ | ≠ | — | Ambos cambiaron | ⚠️ **CONFLICTO** — mostrar diff y preguntar |
| *(sin entrada)* | — | — | Archivo nuevo en el template | **Copiar** y registrar (`origen: template`) |

`origen` es lo que arregla el bug: distingue "esto siempre fue distinto al template" (bootstrap
u override legítimo) de "esto era igual al template y el template avanzó" — las dos únicas
situaciones que antes se confundían bajo `lock ≠ template`.

Solo la fila de conflicto interrumpe al usuario. Las demás se resuelven solas.

## 5. Ciclo de vida

| Momento | Qué pasa con el lock |
|---|---|
| `/adaptar` Flujo A (proyecto nuevo) | Se **crea**: `sha256 = template_sha256` (recién copiado, sin divergencia) → `origen: template` |
| `/adaptar` Flujo C (ya adaptado) | Se **lee** para la comparación de 4 vías, y se **regenera** con las huellas post-sincronización |
| Proyecto sin lock (adaptado antes de v4.2.0) — **bootstrap** | Para cada archivo, calcular `sha256` (actual) y `template_sha256` (template ahora) **por separado**: si coinciden → `origen: template`; si difieren → `origen: override` + `motivo: "diferencia detectada en bootstrap — origen exacto no determinable (placeholder, customización, o versión más nueva); revisar si corresponde"`. **Nunca** se auto-actualiza en la misma pasada del bootstrap — el lock recién nace, no hay base para saber qué cambió desde cuándo |
| Edición manual de una mecánica | El lock queda desactualizado a propósito — la próxima pasada lo detecta como fila 4 de la tabla (`actual ≠ lock.sha256`) y lo registra como `override` |

**El lock nunca se edita a mano.** Lo genera y actualiza `/adaptar`.

## 6. Qué NO cubre el lock de proyecto

- **Comandos, skills y agentes globales** (`~/.claude/`): no se copian a los proyectos, así que
  el lock *de proyecto* no los ve. Los vigila el **shell-lock** — ver §7.
- **Documentos del proyecto** (ROADMAP, CHANGELOG, mecánicas de dominio): son del proyecto
  desde el día uno, nunca vinieron del template.
- **Detección de por qué cambió**: el lock dice *que* cambió, no *qué* cambió. Para eso, diff.

---

## 7. `shell-lock.json` — el manifiesto del shell global

### El problema que resuelve

Los comandos, agentes y skills de Diligencia viven en `~/.claude/`, que **no es un repositorio
git**. Editarlos no deja rastro: no hay `git status` que los muestre, no hay diff, no hay
historial. Si alguien edita `agents/circuito.md` en medio de una sesión y no bumpea la versión
ahí mismo, ese cambio queda corriendo en los 6 proyectos sin que ninguna versión lo documente.

`PENDING.md` existe para eso — pero **solo se lee, nadie lo escribe automáticamente**. Depende
de que la persona (o el agente) se acuerde de anotar. Y eso ya falló: la mutación M1 de Nemesis
(chequeos 4b/4c de `circuito`) estuvo un día aplicada y sin versionar, aun con la entrada
correctamente anotada en `PENDING.md`, porque nadie corrió el paso que la lee.

**Analogía:** `PENDING.md` es un post-it que hay que acordarse de escribir *y* de leer. El
shell-lock es el inventario que se compara solo.

### El archivo

```json
{
  "diligencia_version": "4.3.0",
  "generated": "2026-08-24",
  "generator": "/CBP (proyecto Diligencia)",
  "scope": ["commands/*.md", "agents/*.md", "skills/diligencia-*/**.md"],
  "files": {
    "agents/circuito.md": "c72da8c2a958...",
    "commands/CBP.md": "7146cee4d8cd..."
  }
}
```

Una sola huella por archivo — acá no hay dualidad template/proyecto como en §2, solo
"cómo estaba en la última versión publicada" vs. "cómo está ahora".

**Alcance deliberado:** solo lo que Diligencia gobierna. `skills/` tiene cientos de archivos de
terceros (plugins, skills de Anthropic); trackearlos daría ruido permanente sobre cosas que
Diligencia no versiona ni controla.

### Cómo se usa

| Momento | Qué pasa |
|---|---|
| `/CBP` paso 0.f, **en cualquier proyecto** | Recalcula las huellas de `~/.claude/` y las compara contra el lock. Si difieren → avisa qué archivos globales cambiaron sin versionar |
| Release de Diligencia (`/CBP` con bump) | Se **regenera** con las huellas post-release y el `diligencia_version` nuevo |
| Archivo global nuevo (comando/agente/skill) | Aparece como *sin entrada en el lock* → se reporta igual que un cambio |

```bash
# Recalcular la huella de un archivo global
sha256sum ~/.claude/commands/CBP.md | cut -d' ' -f1
```

### Relación con `PENDING.md`

No se reemplazan, se complementan:

| | Qué aporta |
|---|---|
| `shell-lock.json` | **Detección** — *qué* cambió. Automático, no se puede olvidar |
| `PENDING.md` | **Contexto** — *por qué* cambió y qué habría que documentar. Lo escribe quien hace el cambio |

Un cambio detectado por el lock sin entrada en `PENDING.md` es válido: significa "esto cambió y
nadie explicó por qué" — que es exactamente el aviso que hace falta.

## Archivos relacionados
- `MECANICA-DOCUMENTAL.md` — motor documental del sistema
- `MECANICA-CALIDAD.md` — estándares de calidad y Definición de Hecho
- `~/.claude/commands/adaptar.md` — Fase 2.5, único generador/consumidor del lock
- `INDEX.md` — catálogo de documentación del proyecto
