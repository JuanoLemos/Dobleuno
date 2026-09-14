# Estado de salud — Dobleuno

Generado por `/CBP` (fase `/salud`). Última corrida: 2026-09-14, al cierre de v2.0.0.

---

## Resumen

| Área | Estado | Detalle |
|---|---|---|
| Estructura | ✅ | `doc/` completo (arch, guias, mecanicas, plan, qa, legal) + ROADMAP y CHANGELOG en raíz |
| Links | ✅ | 0 links markdown relativos rotos en `doc/**` y la raíz |
| INDEX | ✅ | Todos los archivos catalogados existen en disco |
| Versión Diligencia | ✅ | Proyecto v4.3.1 == global v4.3.1 |
| Shell global | ✅ | shell-lock 45/45 sin cambios; `PENDING.md` vacío |
| Tests | ✅ | 180 server + 33 web + 5 pipeline, 11 live skip |
| Lint | ✅ | 0 errores, 0 warnings (`--max-warnings=0`) |
| Typecheck | ✅ | 0 errores en los 3 workspaces |
| CI | ✅ | Dos jobs verdes: `test` y `docker` (build de la imagen + compose + smoke + SQL contra la base del contenedor) |
| Temporales | ✅ | 0 versionados; los `.log` y `nppBackup/` locales están gitignored |
| Working tree | ✅ | Limpio, sincronizado con `origin/main` |
| Corpus en Postgres | ✅ | Verificado local: 1796 reglas · 751 items · 577 unidades · 3700 chunks, con `embedding_vec` poblado en los 3700 |
| Imagen Docker | ✅ | Construye, levanta y pasa el smoke — en CI. Nunca se probó en un servidor real |
| Config de producción | ✅ | Un deploy mal configurado no arranca y dice qué falta |
| `scripts/` | ✅ | Entra a lint y typecheck desde v2.0.0 |

## Gaps documentales

| Gap | Severidad | Nota |
|---|---|---|
| ADRs 001–004 no existen | P3 | La numeración arranca en ADR-005; las decisiones previas viven en `doc/plan/PLAN.md` (D1–D14) |
| `bugs.md` e `incidentes.md` vacíos | P3 | Inicializados desde el template, sin entradas propias todavía |
| `doc/plan/PLAN.md` y `PLAN-OLEADAS.md` describen el portal Astro | P3 | Son registro histórico, no estado actual. Se dejan como están a propósito: reescribir un plan viejo borra el contexto de por qué se decidió lo que se decidió |

## Deuda técnica conocida

| Item | Severidad | Nota |
|---|---|---|
| **El oráculo no se probó punta a punta contra DeepSeek** | **P1** | Diagnóstico cerrado y no es nuestro: `npm run deepseek:doctor` confirma key válida, TLS ok, saldo disponible — y la generación devuelve HTTP 200 con los headers en ~500 ms y después nada en 45 s. Igual con curl: sólo `: keep-alive`. DeepSeek acepta la request y no genera. Reintentado varias veces a lo largo de la sesión. De nuestro lado quedaron los timeouts (45 s en el cliente, 504 en `/api/ask`) y el modelo actualizado |
| **La imagen nunca se probó fuera de CI** | **P1** | No hay Docker en la máquina del autor y esta ola no incluyó un servidor real. CI construye, levanta el compose y verifica cinco endpoints más dos consultas SQL — pero un runner no es un VPS con reverse proxy, TLS y un volumen que ya existía |
| El entorno local de Postgres no es reproducible | P2 | Sin Docker, la base corre como `postgresql-16` + `postgresql-16-pgvector` en WSL/Ubuntu, instalada a mano. Y WSL apaga la distro cuando no queda ningún proceso, llevándose Postgres puesto: hay que sostenerla con un proceso vivo mientras se trabaja |
| El corpus está en inglés | P2 | El traductor está endurecido y listo, pero depende del mismo proveedor que el oráculo. `/sobre` lo declara cuando `rulesTranslated === 0` |
| Sin deploy automático ni registry | P3 | Decisión de alcance de la Ola 12: la ola entregó "desplegable y probado", no CD. El deploy es `git pull && docker compose up -d --build` |
| Sin monitoreo ni alerting | P3 | `deploy.md` sugiere un cron con curl a `/api/health/ready`; no hay nada montado |
| Sin escalado horizontal | P3 | El mutex de `kb-sync` y el job queue son in-memory: dos réplicas se pisarían |
| Las unidades no tienen UI en el Codex | P2 | Las 577 están en la base y en `/api/units`, pero la Ola 11 cubrió reglas e items |
| El unit picker no distingue Core/Special/Rare | P2 | El sitio de origen no publica la categoría de lista de ejército, así que `CompositionValidator` no puede verificar los topes de Special y Rare. Ver el mapeo explícito en `apps/web/src/lib/units-api.ts` |
| Los unfurls de Discord/WhatsApp no ven los meta tags | P3 | Esos bots no ejecutan JS y leen el `<head>` del `index.html`. Pide un middleware de Open Graph por user-agent en el server (ADR-011) |
| `AskOutput.fallback` reporta siempre `pgvector` | P3 | Quedó como valor fijo al borrar el fallback ILIKE |
| ROADMAP: todas las olas cerradas | — | 0–12. Lo que siga se decide con el proyecto andando |

## Archivos relacionados
- `ROADMAP.md` — plan por olas
- `INDEX.md` — catálogo de documentación
- `doc/arch/bugs.md` — bug tracker
- `doc/arch/bitacora.md` — índice de sesiones
