# Análisis legal: licencias + compliance — Dobleuno

**Fecha:** 2026-07-09
**Scope:** `/apps/web`, `/apps/server`, `/packages/shared`, `/scripts`, `/docs`
**Disclaimer:** esto NO es consejo legal formal. Para riesgos materiales (carta de GW, enforcement de GDPR, demanda de terceros), consultar un abogado real (IP de juegos de mesa + protección de datos AR/LATAM).

---

## TL;DR — los 4 hallazgos críticos

1. **🔴 No existe `LICENSE.md`** — el README dice "CC BY 4.0 — ver LICENSE.md" pero el archivo no está. `glob **/LICENSE*` desde root da 0 resultados. Crear `LICENSE.md` + `NOTICE.md` con atribuciones (15 min).

2. **🔴 Riesgo latente Games Workshop (TOW)** — GW marca todo "All Rights Reserved" y prohíbe explícitamente AI-training de su contenido. Tow.whfb.app es fan-made (no oficial). Dobleuno parafrasea, no redistribuye, pero falta: (a) disclaimer "Not affiliated with Games Workshop" en UI, (b) rename repo de `old-world-builder` → `Dobleuno` (riesgo trademark si se publica), (c) Privacy Policy/ToS. Si en el futuro querés monetizar → NO sin licencia de GW.

3. **🔴 Gaps GDPR/Ley 25.326 AR** — el server guarda email/name/IP/session, envía preguntas del usuario a DeepSeek (China) y OpenAI (USA) sin consent explícito. Argentina NO tiene "nivel adecuado" con China ni EE.UU. → art. 12 del Decreto 1558/01 exige consent expreso. Falta: `DELETE /api/account` (olvido art. 17), `GET /api/me/export` (portabilidad art. 20), Privacy Policy visible ANTES del signup, checkbox de consent.

4. **🔴 Sin Privacy/ToS/legal en el UI** — búsqueda exhaustiva en `apps/web/src` confirma 0 routes a `/legal`, `/privacy`, `/tos`, 0 footer con atribuciones, 0 disclaimer. Si un usuario de la UE te reclama, no tenés defensa.

**Otros items 🟡:** `/api/ask` no requiere auth (cualquiera puede preguntar a DeepSeek sin cuenta, sin rate-limit) — al menos poner IP-based con `express-rate-limit`. Google Fonts CDN es violación GDPR confirmada (tribunal alemán 2022) → self-host con `fontsource` (30 min). DeepSeek puede usar prompts para entrenar (no hay opt-out claro en API). `apps/server/nppBackup/.env.*.bak` están en disco (no en git pero conviene proteger con `**/*.bak` en `.gitignore`).

**Deps open source 🟢:** todas MIT/Apache-2.0/BSD/ISC. Sin copyleft (GPL/AGPL). Compatible con CC BY 4.0 + combinables entre sí. Solo Apache-2.0 (drizzle, typescript, dexie, sharp) requiere reproducir texto → endpoint `/legal/notices`.

**Scrapeo tow.whfb.app 🟢 técnico / 🟡 legal:** el script respeta robots.txt (Allow: /*, sin rutas Disallow tocadas), rate-limit 2s, manifest finito (~125 URLs hardcodeadas), no spidering recursivo, no commitea data, no redistribuye. Técnicamente correcto; legalmente es fair use / nominative use hoy. Si en el futuro tow.whfb.app agrega ToS o envía C&D → parar mirror inmediatamente.

---

## 1. Licencia del proyecto (mi licencia)

**Declarado:** README línea 191-193 dice `CC BY 4.0 — ver LICENSE.md` + `doc/Sources.md` con atribuciones.

**Real:** ❌ `LICENSE.md` no existe. `glob **/LICENSE*` desde root → 0 resultados. Tampoco `NOTICE`, `THIRD_PARTY`, `CREDITS`. El `.dockerignore` línea 23 incluso lista `LICENSE.md` — sugiere que estaba planeado y se olvidó.

**Impacto:** quien clone no encuentra LICENSE. Si se sube a GitHub sin LICENSE, GitHub asume "All rights reserved" por default → contradice el README.

**Acción (15 min):**
1. Crear `LICENSE.md` con CC BY 4.0 (texto oficial: creativecommons.org/licenses/by/4.0/legalcode.txt)
2. Crear `NOTICE.md` con: tow.whfb.app (fuente mirror), Games Workshop (propietario TOW + disclaimer no-endoso), stack OSS (Vite/React/Tailwind/Drizzle/better-auth/...), fonts (SIL OFL), Lucide (ISC).

---

## 2. Inventario licencias de dependencias (todas compatibles)

**Backend:** express (MIT), better-auth (MIT), drizzle-orm (Apache-2.0), drizzle-kit (MIT), pg (MIT), openai (MIT), zod (MIT).

**Frontend:** react/react-dom (MIT), vite (MIT), typescript (Apache-2.0), tailwindcss (MIT), lucide-react (ISC), dexie (Apache-2.0), zustand (MIT), tailwind-merge (MIT), workbox-window (MIT), vite-plugin-pwa (MIT), react-intl (BSD-3-Clause), react-router-dom (MIT), react-hook-form (MIT).

**Tooling:** prettier/eslint/cheerio/tsx/jsdom/postcss/autoprefixer/sharp → MIT/Apache-2.0.

✅ Sin copyleft (GPL/AGPL). Todo permissive o weak copyleft compatible con CC BY 4.0.

Apache-2.0 (drizzle, typescript, dexie, sharp) requiere reproducir texto de licencia → endpoint `/api/notices` con la lista. Generable con `npx license-checker --production --json > third-party.json` + script.

---

## 3. Scrapeo de tow.whfb.app

**Qué hace `scripts/mirror-tow.ts`:**
- ✅ User-Agent identificable: `Dobleuno/0.1 (+https://github.com/JuanoLemos/Dobleuno)`
- ✅ Respeta `robots.txt` (parsea, aplica `isAllowed()` por request)
- ✅ Rate limit 2s default, configurable
- ✅ Manifest finito (~125 URLs hardcodeadas, no spidering recursivo)
- ✅ Cache local, no re-baja por default
- ✅ NO redistribuye HTML scrapeado, NO commitea data al repo (gitignored). Decisión correcta.

**`robots.txt` de tow.whfb.app (verificado 2026-07-09):** `Allow: /*`, `Disallow: /api/*, /apps/*, /public/apps/*, /regenerate`. ✅ El scraper no toca ninguna ruta `Disallow`. No hay `Crawl-delay` → Dobleuno auto-impone el límite.

**Quién es tow.whfb.app:** no es GW oficial, comunidad fan-made (Warhammer Fantasy Online Rules Index Project). Sin ToS publicado, solo `robots.txt`.

**Análisis:** scrapeo legal bajo `hiQ v. LinkedIn (2022)`. Producto final (DB estructurada + citas) es el punto crítico → ver §4.

**Recomendación:** mantener comportamiento actual. Si en el futuro `tow.whfb.app` agrega ToS o envía C&D → parar mirror inmediatamente + consultar abogado.

---

## 4. 🔴 Contenido Games Workshop (TOW) — riesgo principal

**Lo que dice GW (verificado 2026-07-09):**
> "...© Games Workshop Limited, variably registered around the world. **All Rights Reserved.**"
>
> "**Any use of website content to train generative artificial intelligence (AI) technologies is expressly prohibited.**"

Tow.whfb.app reproduce reglas propiedad de GW. El producto final de Dobleuno es reuso comercial indirecto del IP de GW.

**Modelo de riesgo:**

| Tipo de uso | Riesgo |
|---|---|
| Personal en mesa, sin monetizar | 🟢 Bajo (fair use / nominative use) |
| Free + sin ads | 🟡 Medio (GW ha perseguido apps fan-made) |
| Publicidad / suscripción / marketplace / comunidad | 🔴 Alto (GW tiene abogados de IP, han enviado C&D) |
| "Old World"/"Warhammer" en title/meta/store | 🔴 Trademark — nominative use requiere cuidado |

**Mitigantes actuales:** `Sources.md` declara "fuente espejo" sin atribuirse propiedad. README dice "diseño propio" para sigilo/paleta. App se llama "Dobleuno". No reproduce reglamento literal — parafrasea.

**Gaps actuales:**
- ❌ Sin disclaimer en UI: "No afiliado/endorsado por Games Workshop. Warhammer: The Old World es marca registrada de Games Workshop Limited. Reglas usadas bajo fair use / nominative use."
- ❌ Sin trademark acknowledgements en index.html meta o footer.
- ❌ Repo se llama `Dobleuno/old-world-builder` (per user_profile, fork sobre nthiebes/old-world-builder). Nombre upstream expone "old-world-builder" → trademark issue si se hace público.

**Acciones inmediatas:**
1. Disclaimers en UI (15 min): About/Legal page con atribución completa, footer con disclaimer, meta tag en index.html.
2. Renombrar repo GitHub a neutral (no "old-world-builder"). Mantener "Dobleuno".
3. Si en futuro monetiza: NO sin licencia de GW. Probablemente GW no licencia apps de este tipo → posicionamiento "for personal use only", sin monetizar.

---

## 5. 🔴 Compliance de protección de datos (GDPR / LGPD / Ley 25.326 AR)

**Datos personales (ver `apps/server/src/db/schema/users.ts`):**

| Campo | Sensibilidad |
|---|---|
| email (unique, required) | PII directa |
| name (required) | PII directa |
| password (hashed, better-auth) | Credential |
| session.token, ipAddress, userAgent | PII seudonimizable |
| image, emailVerified, isAdmin | metadata |
| createdAt/updatedAt/lastActive | timestamp |

**Datos derivados:** preguntas del usuario en `/api/ask` → enviadas a **DeepSeek (China)** + **OpenAI (USA)** como texto crudo. Listas y batallas → almacenadas en PG local (Hetzner). **Backups no verificados** — crítico para GDPR.

**🇪🇺 GDPR (si usuarios de UE):** sin base legal documentada, breach notification sin proceso, ❌ sin endpoint "olvido" (art. 17), ❌ sin portabilidad (art. 20), ❌ sin registro de actividades (art. 30).

**🇧🇷 LGPD (usuarios de Brasil):** similar, ANPD puede multar.

**🇦🇷 Ley 25.326 AR (la que más aplica):**
- ❌ Consentimiento (art. 5, 6): sin banner ni privacy policy.
- ✅ Datos sensibles (art. 2): ninguno recolectado.
- ⚠️ Derechos ARCO: solo parcial (DELETE en battles/lists). NO supresión total del perfil.
- 🔴 **Transferencia internacional (art. 12, Decreto 1558/01):** a DeepSeek (China) y OpenAI (USA) requiere **consent expreso e informado**. Argentina NO tiene "nivel adecuado" con China ni EE.UU. Sin DPA/SCC, se necesita consent expreso. **No se está pidiendo.**

**Acciones (ordenadas por costo/impacto):**
1. Privacy Policy + ToS en producto (`/legal/*`):
   - Privacy: qué datos, dónde (región), con quién (DeepSeek China, OpenAI USA, Google Fonts CDN).
   - ToS: no afiliación GW, "as-is", no comercial sin licencia.
   - **Mostrarlos ANTES del primer uso**, no solo footer.
2. **Checkbox de consent explícito en signup:** "Acepto Privacy y ToS. Entiendo que mis preguntas se envían a DeepSeek (China) y OpenAI (USA). Required."
3. Endpoints derechos ARCO:
   - `DELETE /api/account` — cascade.
   - `GET /api/me/export` — JSON de listas+batallas+historial.
4. Logging + retention: definir cuánto se guardan logs.
5. Si crece: cambiar a provider con DPA (Anthropic SCC disponible) o self-hosted Ollama. O sanitizar preguntas.

---

## 6. Manejo de secretos

✅ `.gitignore` (root + apps/server) incluye `.env`, `.env.local`. ✅ `git ls-files` confirma NO hay `.env`, NO hay backups, NO hay data scrapeado commiteado. ✅ `.env.example` solo placeholders.

**Hallazgo:** `apps/server/nppBackup/.env.YYYY-MM-DD_*.bak` existen en disco (NO en git). Backups automáticos de Notepad++. Podrían commitearse en el futuro si no estás pendiente.

**Recomendación:** agregar `**/*.bak` y `**/*~` al `.gitignore` para proteger backups de cualquier editor. Hoy con .env está bien para proyecto personal.

---

## 7. 🟡 LLM (DeepSeek) — análisis específico

**ToS verificados (2026-07-09):**
- **Datos en China.** Procesados y almacenados en servers chinos.
- 🔴 **"Train on API data: Allowed by default"** — DeepSeek PUEDE usar prompts para entrenar futuras versiones. Sin opt-out claro en API.
- **Data retention: Unspecified duration** — sin retention period definido.
- **SOC 2: No. GDPR Compliance: Unclear.**
- ✅ Modelos (V3/R1) bajo MIT License — OK para uso comercial.

**Compliance vs riesgo:**

| Acción | Riesgo |
|---|---|
| Preguntas de reglas genéricas ("¿bosque da cover contra carga?") | 🟡 Bajo |
| Preguntas con contexto personal/partida | 🔴 Medio (va a China, puede usarse para training) |
| Emails/nombres de usuario en prompts | 🔴 Alto |

**Recomendaciones:**
1. **Sanitizar inputs al LLM:** wrapper antes de `openai.chat.completions.create()` que substituya emails/nombres/ids por `[REDACTED]`. Defense-in-depth.
2. Documentar en Privacy Policy que preguntas se envían a DeepSeek. Consentimiento explícito en signup.
3. Si crece: cambiar a provider con DPA (Anthropic SCC disponible). Costo ~10x más pero compliance real.
4. No usar DeepSeek para PII o secretos.

---

## 8. 🔴 Privacidad en UI — gaps concretos

Búsqueda exhaustiva en `apps/web/src` confirma:
- ❌ Sin footer con atribuciones/legal.
- ❌ Sin ruta `/legal`, `/privacy`, `/tos`, `/about`.
- ❌ Sin link a privacy/ToS en ningún lado del UI.
- ❌ Sin banner de cookies/consent.
- ❌ Sin disclaimer "Not affiliated with Games Workshop" visible.

Combinable con GDPR art. 13 (derecho a ser informado ANTES de recolectar) y Trademark defense GW.

**Acción:** crear ruta `/legal` con sub-rutas (`/legal/privacy`, `/legal/terms`, `/legal/attributions`). Links desde About (futuro) o footer minimal en `AppShell.tsx`.

---

## 9. 🟡 Rate limiting prometido vs implementado

ADR-005 declara: "Rate limiting por usuario: 10 preguntas/minuto (better-auth nativo), 100 preguntas/día (custom)."

Búsqueda exhaustiva en `apps/server/src`:
- ❌ Sin rate-limit en `/api/ask`.
- ❌ Único rate-limit está en `scripts/mirror-tow.ts` (scraper).
- ⚠️ Además, `/api/ask` **NO requiere auth** (`askRouter.post('/')` no llama middleware `req.authUser`). Peligroso:
  - Cualquiera puede preguntar sin cuenta.
  - Rate limiting por usuario no puede aplicarse (no hay usuario).
  - Coste impredecible si alguien scrapea.

**Acción:**
1. Si `/api/ask` se mantiene público → rate-limit por IP (`express-rate-limit`, ~5 req/min por IP).
2. Si va a ser por usuario → conectar al middleware `auth.ts`.
3. Implementar el rate-limit de la ADR o actualizar ADR para reflejar realidad.

---

## 10. Google Fonts CDN (preconnect en index.html)

`apps/web/index.html` líneas 14-19 cargan DM Serif Display, Outfit, JetBrains Mono desde `fonts.googleapis.com`.

**Problema GDPR:** cada carga de página → request a Google → Google recibe IP + User-Agent + Referer. Tribunal alemán (LG München I 20.01.2022, 3 O 17493/20) confirmó que cargar Google Fonts sin consent es **violación de GDPR** → multa.

**Recomendación:** 🟢 self-host fonts con `fontsource` (npm `@fontsource/dm-serif-display`, etc., todos MIT/SIL OFL). Vite los incluye automáticamente. Costo: 30 min. Beneficio: GDPR-compliant, mejor performance, mejor offline/PWA.

---

## Resumen ejecutivo — qué hacer esta semana

| # | Acción | Tiempo | Prioridad |
|---|---|---|---|
| 1 | Crear `LICENSE.md` con CC BY 4.0 + `NOTICE.md` con atribuciones | 15 min | 🔴 |
| 2 | Renombrar repo de GitHub de `old-world-builder` a `Dobleuno` | 2 min | 🔴 |
| 3 | Disclaimer "Not affiliated with Games Workshop" en UI + index.html meta | 30 min | 🔴 |
| 4 | Privacy Policy + ToS mínimos (`/legal/*`) + consent en signup | 2-3 hs | 🔴 |
| 5 | Endpoints GDPR: `DELETE /api/account`, `GET /api/me/export` | 1-2 hs | 🔴 |
| 6 | Self-host fonts (eliminar preconnect a Google Fonts) | 30 min | 🔴 |
| 7 | Rate-limit en `/api/ask` + decisión público-auth | 1-2 hs | 🟡 |
| 8 | Sanitización inputs a DeepSeek antes de enviar | 1-2 hs | 🟡 |
| 9 | Limpiar backups Notepad++ (`nppBackup/`) del disco | 5 min | 🟢 |
| 10 | Agregar `**/*.bak` y `**/*~` al `.gitignore` | 1 min | 🟢 |
| 11 | Endpoint `/legal/notices` con licencias deps Apache-2.0 / BSD | 1 h | 🟢 |
| 12 | Documentar "datos en China" en ADR-005 | 10 min | 🟢 |

**Total: ~1 día de trabajo.**

---

## Fuera de scope

❌ Términos de servicio del producto final (lo escribe el dueño con abogado).
❌ Redacción de contratos comerciales / NDAs.
❌ Auditoría de seguridad técnica (CVE, XSS, CSRF, injection) — eso es security-reviewer.
❌ Análisis de conformidad del prompt LLM con ToS DeepSeek — safety + prompt-engineering.
❌ Litigio potencial o respuesta a cease & desist de GW.

Para esos, derivar a abogado real con experiencia en:
- IP de entretenimiento / juegos de mesa (temas GW)
- Protección de datos en LATAM (Ley 25.326 AR + LGPD BR)

---

*Disclaimer reiterado: análisis informativo, no consejo legal formal. Si se envía carta de GW, notificación de ANPD/AAIP, o se está considerando monetizar → contratar abogado antes de tomar decisiones materiales.*
