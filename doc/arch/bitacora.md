# Bitácora — Índice de sesiones v1.0

Una línea por sesión de trabajo. **Append-only**: nunca se edita ni se borra una línea previa.
El detalle de cada sesión vive en `doc/arch/walkthrough/`.

---

| Fecha | Comando | Tema | Walkthrough | Versión |
|---|---|---|---|---|
| 2026-09-14 | `/adaptar` + `/CBP full` | Adaptación a Diligencia (Flujo B) | [walkthrough](walkthrough/2026-09-14_0100_CBP-full_adaptacion-diligencia.md) | v1.0.2 |
| 2026-09-14 | `/CBP commit` | SISTEMA.md al día + lista de ADRs corregida | [walkthrough](walkthrough/2026-09-14_0200_CBP-commit_sistema-al-dia.md) | v1.0.3 |

---

## Cómo se usa

- La escribe `/CBP` durante BUILD, al cerrar una sesión (ver `MECANICA-CBP.md`).
- Es un **índice**, no un registro: 1 línea, sin detalle. El detalle va al walkthrough.
- Sesiones triviales (typo, formato, sin decisión de diseño) no generan entrada.

## Archivos relacionados
- `walkthrough/_template.md` — plantilla del detalle por sesión
- `MECANICA-CALIDAD.md` — Definición de Hecho (el walkthrough es parte del DoD)
