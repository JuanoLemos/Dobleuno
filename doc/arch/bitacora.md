# Bitácora — Índice de sesiones v1.0

Una línea por sesión de trabajo. **Append-only**: nunca se edita ni se borra una línea previa.
El detalle de cada sesión vive en `doc/arch/walkthrough/`.

---

| Fecha | Comando | Tema | Walkthrough | Versión |
|---|---|---|---|---|
| 2026-09-14 | `/adaptar` + `/CBP full` | Adaptación a Diligencia (Flujo B) | [walkthrough](walkthrough/2026-09-14_0100_CBP-full_adaptacion-diligencia.md) | v1.0.2 |
| 2026-09-14 | `/CBP commit` | SISTEMA.md al día + lista de ADRs corregida | [walkthrough](walkthrough/2026-09-14_0200_CBP-commit_sistema-al-dia.md) | v1.0.3 |
| 2026-09-14 | Ola 10 | Crónicas: relato con IA + galería de fotos | [walkthrough](walkthrough/2026-09-14_0400_ola-10_cronicas.md) | v1.1.0 |
| 2026-09-14 | Ola 11 | Codex en React: el pipeline por fin baja contenido, el portal se retira | [walkthrough](walkthrough/2026-09-14_1300_ola-11_codex-react.md) | v1.2.0 |
| 2026-09-14 | `/CBP` | Verificación del seed contra Postgres real: cierra el P1 de la Ola 11 | [post-cierre](walkthrough/2026-09-14_1300_ola-11_codex-react.md#post-cierre--verificación-del-seed-2026-09-14-misma-sesión) | v1.2.0 |
| 2026-09-14 | Ola 12 | Deploy consolidado: la imagen nunca había construido, y ahora se verifica en CI | [walkthrough](walkthrough/2026-09-14_2000_ola-12_deploy-consolidado.md) | v2.0.0 |

---

## Cómo se usa

- La escribe `/CBP` durante BUILD, al cerrar una sesión (ver `MECANICA-CBP.md`).
- Es un **índice**, no un registro: 1 línea, sin detalle. El detalle va al walkthrough.
- Sesiones triviales (typo, formato, sin decisión de diseño) no generan entrada.

## Archivos relacionados
- `walkthrough/_template.md` — plantilla del detalle por sesión
- `MECANICA-CALIDAD.md` — Definición de Hecho (el walkthrough es parte del DoD)
