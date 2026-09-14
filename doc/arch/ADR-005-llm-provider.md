# ADR-005: LLM Provider

| Campo | Valor |
|---|---|
| **Decisión** | Usar **DeepSeek** (modelos V3 / R1 / V4 según disponibilidad) como LLM principal de chat para Dobleuno. Embeddings: **OpenAI `text-embedding-3-small`**. SDK única: **`openai` oficial** (compatible con DeepSeek). |
| **Estado** | Accepted |
| **Fecha** | 2026-07-08 |
| **Supersedes** | ADR-003 § Decisión (parcial) |
| **Superseded by** | N/A |
| **Impacto** | Costo bajo por uso de API (DeepSeek es ~20-30x más barato que Claude), dependencia de un único SDK (openai), claves en variables de entorno. |

## Contexto

Dobleuno es una app de mesa para Warhammer: The Old World. El "rules oracle" (consultas de reglas en lenguaje natural) y el "asesor post-partida" requieren un LLM con buena capacidad de razonamiento y citations confiables.

Necesitamos:
1. **Un LLM de chat** con buena calidad en español, citations consistentes, latencia < 3s.
2. **Un modelo de embeddings** barato y eficiente para RAG sobre la KB de reglas (~500 páginas scrapeadas de tow.whfb.app).
3. **Gestión de claves** segura (no exponer en el frontend, rate limiting).
4. **Costo operativo bajo** — somos un solo usuario activo, no podemos permitirnos un vendor premium para un side-project.

## Decisión

### LLM de chat: DeepSeek (vía SDK openai)

DeepSeek expone una **API compatible con OpenAI Chat Completions**, así que usamos el SDK oficial de `openai` apuntando a `https://api.deepseek.com`. Esto nos da:

- **Un solo SDK** para mantener (openai), no dos (anthropic + openai).
- **Compatibilidad** con otros providers OpenAI-like (Together, Groq, OpenAI mismo) si en el futuro queremos cambiar.
- **Costo** ~20-30x menor que Anthropic Claude 3.5 Sonnet.

Modelos disponibles (configurable via `DEEPSEEK_MODEL`):

| Modelo | Uso | Costo (input/output por 1M tokens) |
|---|---|---|
| `deepseek-chat` (V3) | Default, rápido, sin reasoning | $0.14 / $0.28 |
| `deepseek-reasoner` (R1) | Para preguntas complejas, con thinking | $0.55 / $2.19 |
| `deepseek-v4-pro` (si disponible) | Más capaz, ideal para coaching post-partida | a confirmar |
| `deepseek-v4-flash` (si disponible) | Barato y rápido, ideal para la mayoría de las consultas | a confirmar |

**Default:** `deepseek-chat` (V3). El usuario puede overridear.

**Por qué no Anthropic en este proyecto:** costo 20-30x mayor, sin ventaja de calidad observable para el caso de uso (reglas de TOW estructuradas). La diferencia en citations se compensa con validación regex + retry post-respuesta.

### Embeddings: OpenAI text-embedding-3-small

- **Modelo:** `text-embedding-3-small` (1536 dimensiones).
- **Por qué OpenAI y no DeepSeek:** DeepSeek no expone modelo de embeddings público (a la fecha). OpenAI es el estándar, barato y suficiente calidad.
- **Costo:** $0.02/1M tokens. Para indexar 500 páginas (~2M tokens una vez, después incremental) ≈ $0.04 inicial, $0.001 por update.

### SDK única: `openai`

```ts
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});
const res = await client.chat.completions.create({ ... });
```

### Configuración de inferencia

- `temperature: 0.3` — baja creatividad, alta precisión.
- `max_tokens: 1500` — suficiente para respuesta + 2-3 citas.
- `top_p: 0.9` — default.
- `model: 'deepseek-chat'` por default, configurable via env.

### Almacenamiento de claves

- Variables de entorno en el server (Hetzner): `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`.
- Rate limiting por usuario: 10 preguntas/minuto (better-auth nativo), 100 preguntas/día (custom).
- Sin claves en el cliente.

### Fallback

Si DeepSeek API no responde / rate limit:
- Fallback a `deepseek-reasoner` (otro modelo del mismo vendor).
- Sin fallback a otro vendor en MVP (complejidad operativa).

## Costo mensual estimado (1 usuario activo)

| Componente | Estimación | Costo/mes |
|---|---|---|
| DeepSeek V3 chat (100 preguntas/día × 30 días) | ~3M input + 1.5M output | ~$1 |
| DeepSeek R1 (5% de las preguntas, complejas) | ~150K input + 75K output | ~$0.30 |
| OpenAI embeddings (1 update/semana de la KB) | ~200K tokens | ~$0.01 |
| **Total estimado** | | **~$1.30/mes** |

vs Anthropic Claude 3.5 Sonnet para el mismo uso: **~$20-30/mes**.

## Consecuencias

- ✅ Costo operativo muy bajo (~$1.30/mes)
- ✅ Un solo SDK (openai), código más simple
- ✅ Modelos intercambiables via env var
- ✅ Calidad suficiente para el caso de uso (reglas estructuradas, citations regex-validadas)
- ⚠️ Dependencia de DeepSeek (vendor menos maduro que Anthropic, pero API OpenAI-compatible lo hace swappable)
- ⚠️ Reasoning quality del V3 es menor que Claude Opus 4 / Sonnet 4 en preguntas multi-step; mitigamos con reasoning model cuando haga falta

## Reversibilidad

Alta. Migrar a otro provider OpenAI-compatible es:
- ~1 hora de trabajo (cambiar `DEEPSEEK_BASE_URL` y `DEEPSEEK_MODEL`)
- Re-validar la suite de regresión (puede haber cambios en estilo de respuesta)

---

*Lifecycle: Proposed → **Accepted** → Deprecated → Superseded*
