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
