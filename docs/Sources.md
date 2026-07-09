# Sources

Dobleuno usa las siguientes fuentes para el contenido de reglas de Warhammer: The Old World. Toda attribution está consolidada acá.

## Reglas de TOW (TOW)

### Fuente primaria

**[tow.whfb.app](https://tow.whfb.app/)** — sitio comunitario que mantiene un mirror de las publicaciones oficiales de Games Workshop para TOW, incluyendo:

- Reglamento base (publicado 2024 por Games Workshop)
- Erratas oficiales de Games Workshop
- FAQs oficiales de Games Workshop
- Datos de unidades, items mágicos, reglas especiales

**Uso en Dobleuno:** mirror periódico (cron diario a las 03:00 UTC) que descarga las páginas, las parsea a JSON estructurado, y las indexa en la base de conocimiento.

**License:** El contenido scrapeado de `tow.whfb.app` se usa en runtime y cache local de Dobleuno. **No se redistribuye** en este repositorio ni se commitea al código fuente. Ver `.gitignore` (`data/raw/`, `data/processed/`).

### Fuente secundaria

**Games Workshop — publicaciones oficiales de The Old World (2024 en adelante).** El reglamento, erratas y FAQs oficiales son propiedad de Games Workshop. Dobleuno parafrasea y codifica las mecánicas en datos estructurados, no reproduce texto literal extenso.

## Atribuciones específicas

- Sigilo "2·1" en heater shield: diseño propio del proyecto Dobleuno.
- Paleta de colores y tipografía: inspiradas en heraldica medieval y Old World aesthetic.
- Nombre "Dobleuno": del usuario (Juano).

## LLM

- **DeepSeek** ([platform.deepseek.com](https://platform.deepseek.com/)) — modelo de chat V3/R1/V4.
- **OpenAI** ([platform.openai.com](https://platform.openai.com/)) — embeddings `text-embedding-3-small`.

## Créditos adicionales

- Stack: Vite, React, Tailwind, Drizzle, better-auth, Dexie, Zustand, Zod, react-router, react-intl — open source,各自的 licencia en sus repos.
