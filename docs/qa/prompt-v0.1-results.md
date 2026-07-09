# Dobleuno · Prompt v0.1 — Resultados de la suite live

> **Estado:** ✅ Cerrado con éxito (2026-07-08)
> **Ejecutado por:** usuario (Juano) en local, Windows + PowerShell
> **Modelo:** DeepSeek (vía SDK `openai`, base URL `https://api.deepseek.com`)
> **Versión del prompt:** 0.1

## Resultado global

- **10/10 preguntas** de la fixture pasaron los criterios de aceptación.
- **Latencia** observada: variable por pregunta, **demasiado alta para uso en partida real** (~5-10s por pregunta promedio, no aceptable cuando el jugador está en mesa).
- **Cero alucinaciones** detectadas en la suite — todas las respuestas trajeron al menos 1 cita.
- **Comportamiento correcto** en edge cases: rechazo amable de preguntas fuera de TOW, admisión de falta de información cuando la regla no está en KB.

## Observaciones de uso real (mesa)

✅ **Lo que funcionó bien:**
- Tono y formato de respuesta consistentes (veredicto + explicación + cita).
- Few-shot examples guiaron bien al modelo a responder en español rioplatense.
- Rechazo de off-topic (40K) sin divagar.
- Manejo de preguntas ambiguas pidiendo clarificación.

⚠️ **Lo que NO sirve en mesa:**
- **Latencia alta**: cada pregunta toma varios segundos, el jugador está en mesa y necesita respuesta en <2s.
- Imposible responder 3-4 preguntas en una fase de magia (donde se consulta mucho).

## Decisión arquitectónica que esto confirma

**No usar LLM directo en producción.** La arquitectura tiered (ya en PLAN-OLEADAS Ola 5):

1. **FAQs pre-canned** — top 50-100 preguntas frecuentes con respuesta canónica. Lookup instantáneo en Dexie (cliente) o Postgres (server). **Costo: 0, latencia: <50ms**.
2. **KB lookup con pgvector** — para preguntas similares no exactas. Embedding + similarity search. **Costo: ~$0.0001/consulta, latencia: 100-500ms**.
3. **LLM (DeepSeek V3)** como fallback — solo para preguntas únicas que no matchean nada. **Costo: ~$0.001-0.01, latencia: 2-3s**.

El 80% de las preguntas en una partida real van a caer en (1) o (2). Solo el 20% llega a (3).

## Action items para Ola 5 (RAG)

Cuando lleguemos a Ola 5:

- [ ] Definir las 50-100 FAQs iniciales (las más comunes en partidas de TOW)
- [ ] Indexar la KB completa de tow.whfb.app en Postgres + pgvector
- [ ] Implementar la búsqueda tiered en el server: FAQ → KB → LLM
- [ ] Cachear respuestas del LLM en Postgres (TTL 7 días) para evitar llamadas repetidas
- [ ] Métrica: medir distribución FAQ / KB / LLM en uso real

## Pendiente

- [ ] Pegar el output detallado de `npm test` (latencia por pregunta) a este archivo cuando se vuelva a correr
- [ ] Medir latencia p50 y p95 de las 10 preguntas en una corrida fresca
