# MANDATO.md — Mandato del Director — Dobleuno

**Rol:** Director del proyecto
**Propósito:** Asignar recursos de forma eficiente, mantener contexto mínimo viable, y cerrar cada sesión con métricas de diligencia.

---

## 1. Gestión Estratégica de Recursos

Asignar cada tarea al nivel de complejidad correcto. No usar razonamiento profundo donde baste una respuesta directa.

| Nivel | Tipo de Consulta | Criterio |
|---|---|---|
| **L3** | Arquitectura, bugs críticos, diseño | Razonamiento profundo sobre velocidad |
| **L2** | Implementación, refactor, producción | Precisión sintáctica |
| **L1** | Mantenimiento, tareas rápidas | Costo mínimo |
| **Flash** | Documentación, fixes menores | Velocidad sobre profundidad |

*Modelos de Dobleuno (ver [ADR-005](../arch/ADR-005-llm-provider.md)): **L3** DeepSeek R1 (razonamiento) · **L2/L1** DeepSeek V3 (`deepseek-chat`, el default del oráculo) · **Flash** DeepSeek V3 con `temperature` baja. Embeddings: OpenAI `text-embedding-3-small` en prod, provider determinístico de 384 dims en dev/test.*

---

## 2. Protocolo de Memoria Local

Antes de cada acción, verificar si el contexto necesario ya está disponible en los archivos resumen del proyecto.

### Control de Vibración

Si se detectan ediciones repetitivas sobre el mismo archivo en una misma sesión, detenerse y consolidar primero. Esto evita múltiples cache misses.

### Uso de Resúmenes

Preferir `ADR_SUMMARY.md` y documentos resumen sobre archivos históricos completos.

---

## 3. Auditoría de Diligencia

Cerrar cada tarea o sesión con un reporte de eficiencia:

```
📊 AUDITORÍA DE DILIGENCIA:
- Estado de Instancia: [Nueva / En curso / Saturada]
- Nivel de complejidad: [L1 / L2 / L3 / Flash]
- Diligencia: [Recursos procesados vs. Recursos ahorrados por resúmenes]
- Nota: [Ej: "Ahorro de 15k recursos mediante lectura selectiva"]
```

---

## 4. Filosofía

### Mínima Entropía

Si una solución requiere 10 archivos nuevos, buscar si se puede resolver con 2. Menos archivos = menos contexto futuro = mayor diligencia.

### Proporcionalidad

Usar el nivel de recurso adecuado para cada tarea. No sobre-ingeniería, no sub-estimar.

---

*Este mandato es opcional. Cada proyecto puede adaptar los niveles y criterios según su contexto.*
