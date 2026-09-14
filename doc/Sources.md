# Sources

Dobleuno usa las siguientes fuentes para el contenido de reglas de Warhammer: The Old World. Toda attribution está consolidada acá.

## Reglas de TOW (TOW)

### Fuente primaria

**[tow.whfb.app](https://tow.whfb.app/)** — sitio comunitario que mantiene un mirror de las publicaciones oficiales de Games Workshop para TOW, incluyendo:

- Reglamento base (publicado 2024 por Games Workshop)
- Erratas oficiales de Games Workshop
- FAQs oficiales de Games Workshop
- Datos de unidades, items mágicos, reglas especiales

**Uso en Dobleuno:** el pipeline de `scripts/` (mirror → parse → validate → translate) baja el
manifest que declaran los tres sitemaps del sitio, con rate limit de 2s, User-Agent identificable y
cache en disco. También hay un re-sync triggereable vía `POST /api/admin/kb/sync` (admin-only, job
queue in-memory; reemplazó al cron diario de la Ola 2 en v0.8.0).

**Qué se almacena, desde la Ola 11 (v1.2.0):** el corpus completo — 1796 reglas especiales, 751
items mágicos y 577 unidades — en la base de Dobleuno, y el texto de cada entrada se muestra en el
Codex.

Esto es un cambio material respecto de lo que este documento decía antes. Hasta la v1.1.0 la frase
era "Dobleuno parafrasea y codifica, no reproduce texto literal extenso", y era cierta: la KB eran
9 unidades y 5 reglas escritas a mano en el código. **Ya no lo es.** El Codex muestra el texto de
las reglas tal como lo publica el sitio de origen.

Las decisiones que acompañan ese cambio:

- **`noindex` + `robots.txt`** en las rutas del Codex. Público, pero no ofrecido a los buscadores.
  Ver [ADR-011](arch/ADR-011-codex-react-noindex.md).
- **No se redistribuye en el repo.** `.gitignore` declara `data/raw/`, `data/processed/` y
  `data/translated/`; el corpus no entra al artefacto versionado ni al bundle del cliente. Viaja
  del server al IndexedDB del usuario.
- En producción, el cache se monta en el volumen `dobleuno-kbdata` (persiste entre reinicios).
- Cualquier derecho sobre las reglas de TOW permanece con Games Workshop. El uso es bajo fair use
  / nominative use, sin fines comerciales, y el riesgo está registrado como latente 🔴 en
  `legal/ANALISIS-LICENCIAS-COMPLIANCE.md`.

### Fuente secundaria

**Games Workshop — publicaciones oficiales de The Old World (2024 en adelante).** El reglamento, erratas y FAQs oficiales son propiedad de Games Workshop. Dobleuno no está afiliado ni respaldado por Games Workshop, y el disclaimer figura en `/sobre`, en el footer del Codex y en `/legal/terms`.

## Atribuciones específicas

- Sigilo "2·1" en heater shield: diseño propio del proyecto Dobleuno.
- Paleta de colores y tipografía: inspiradas en heraldica medieval y Old World aesthetic.
- Nombre "Dobleuno": del usuario (Juano).

## LLM

- **DeepSeek** ([platform.deepseek.com](https://platform.deepseek.com/)) — modelo de chat V3/R1/V4.
- **OpenAI** ([platform.openai.com](https://platform.openai.com/)) — embeddings `text-embedding-3-small`.

## Créditos adicionales

- Stack: Vite, React, Tailwind, Drizzle, better-auth, Dexie, Zustand, Zod, react-router, react-intl — open source, cada dependencia con su propia licencia en sus respectivos repos.
