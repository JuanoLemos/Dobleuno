<!-- ADAPTAR: Reemplazar Dobleuno por el nombre real del proyecto. Mantener actualizado con cada ADR nuevo. -->
# ADR_SUMMARY.md — Resumen de Decisiones Arquitectónicas

**Sistema:** Dobleuno
**Propósito:** Resumen ejecutivo de todas las ADRs activas del proyecto.

---

## Reglas del Sistema ADR

1. Toda decisión significativa debe tener un ADR.
2. Los ADRs deben referenciarse donde corresponda (código, docs, tareas).
3. Ciclo de vida: Proposed → Accepted → Deprecated → Superseded.
4. Mantener contexto actualizado en DILIGENCIA.md.

---

## ADRs Activos

| ADR | Decisión | Estado | Fecha | Impacto |
|---|---|---|---|---|

---

## Estadísticas

| Métrica | Valor |
|---|---|
| **Total ADRs** | 0 |
| **Aceptados** | 0 |
| **Propuestos** | 0 |
| **Obsoletos** | 0 |

---

## Template

Usar [adr-template.md](adr-template.md) para nuevas decisiones.

## Referencias

- `doc/arch/adr-template.md` — template para nuevas ADRs
- `DILIGENCIA.md` — convención de estructura del proyecto

## ADR-010 — Crónicas: modelo de datos, storage y generación

**Aceptado** · 2026-09-14 · Ola 10. Tablas propias en vez de campos en `battles.data`; una crónica por batalla; visibilidad elegida por el autor; storage en disco con volumen propio y capability URLs; el relato se ancla a unidades y hitos reales y se valida en el server. Ver [ADR-010](ADR-010-cronicas-data-model.md).

## ADR-011 — Codex en React, sin indexar, y retiro del portal Astro

**Aceptado** · 2026-09-14 · Ola 11. El Codex se sirve desde la app React con piel propia por ruta y datos de la API (no bundleados); las rutas son públicas pero llevan `noindex` por el riesgo legal del contenido de GW; `portal/` se retira (última versión en el tag `v1.1.0`). Supersede la cláusula de SEO del ADR-006, cuyo fundamento suponía un portal con reglas publicadas que nunca existió. Ver [ADR-011](ADR-011-codex-react-noindex.md).

## ADR-012 — Topología de un contenedor y despliegue consolidado

**Aceptado** · 2026-09-14 · Ola 12. Un solo contenedor sirve la API y el cliente desde el mismo origen (`VITE_API_URL` vacío, para que la imagen no quede atada a un dominio); las migraciones son un servicio one-shot y no un paso manual; el corpus se copia al volumen porque hornearlo en la imagen sería redistribuirlo (`Sources.md`); y producción exige la configuración que hasta ahora era toda opcional. La imagen se verifica en CI, que es el único lugar donde se puede. Ver [ADR-012](ADR-012-topologia-un-contenedor.md).
