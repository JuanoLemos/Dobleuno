# Dobleuno — Prompts (Ola 0.5)

System prompt del asistente de mesa. v0.1.

## Estructura

```
src/prompts/
├── system.ts                    # El prompt + builders + regex
├── types.ts                     # Tipos compartidos
├── llm-client.ts                # Cliente DeepSeek vía SDK openai
├── runner.ts                    # CLI para uso interactivo
├── __tests__/
│   └── system.test.ts           # Suite de regresión (estática + live)
└── fixtures/
    ├── questions.json           # 10 preguntas canónicas
    └── expected-answers.json    # Criterios de aceptación
```

## Uso

### Configurar API key

```bash
cp .env.example .env
# Editar .env y completar DEEPSEEK_API_KEY
```

### Correr tests

```bash
# Solo estáticos (no requiere API key)
npm test

# Live con API (requiere API key)
DEEPSEEK_API_KEY=sk-... npm test
```

### Probar interactivamente

```bash
# Una pregunta
npm run runner -- "¿Puedo declarar carga a través de un bosque?"

# Eval completo (las 10 preguntas)
npm run runner -- --eval

# Una pregunta específica del eval
npm run runner -- --eval --id=q1-movement-cover

# Cambiar modelo
DEEPSEEK_MODEL=deepseek-reasoner npm run runner -- "..."
```

## Versión

- `PROMPT_VERSION` = `'0.1'`
- `PROMPT_LAST_UPDATED` = `'2026-07-08'`
- Provider: **DeepSeek** (API OpenAI-compatible)
- Modelo default: `deepseek-chat` (V3). Override con `DEEPSEEK_MODEL`:
  - `deepseek-chat` — V3, rápido, sin reasoning
  - `deepseek-reasoner` — R1, con thinking
  - `deepseek-v4-pro` / `deepseek-v4-flash` — si tenés acceso

## Cambios respecto a versiones anteriores

v0.1 (2026-07-08) — primera versión. Creado desde cero.
  · Cambio de provider: Anthropic → DeepSeek (costo ~20-30x menor, mismo SDK openai).
