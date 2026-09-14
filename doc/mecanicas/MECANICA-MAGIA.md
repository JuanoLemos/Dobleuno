# Mecánica — Fase de Magia (TOW)

> Referencia para el rules oracle. Datos codificados en `apps/web/src/lib/magic-helper.ts` (Ola 4).

## Flujo de la fase de magia

1. **Generar Winds of Magic**: 2D6 base. Total = dados disponibles.
2. **Channeling**: cada Wizard tira 2D6, suma si excede su nivel de mago.
3. **Casting**: cada Wizard elige un hechizo y tira 2D6 vs dificultad.
4. **Dispel**: el rival intenta despelar, gastando 2DD.
5. **Resolution**: hechizo impacta, falla, o se vuelve irresistible (doble 6).

## Winds of Magic

```
Dados_de_magia = 2D6 + channeling_total
  - 2D6: 2 a 12 dados iniciales
  - Channeling: cada Wizard tira 2D6, si el resultado es >= su nivel, suma
                el exceso a los dados de magia. Ej: Wizard nivel 4 tira 11, suma 7.
```

Los dados **se gastan** en casting y dispel. Si no hay dados, no se castea ni se despela.

## Casting

Para casear un hechizo:

```
Resultado_casting = 2D6
Dificultad = nivel_del_hechizo × 2 (1→2, 2→4, 3→6, 4→8)
Éxito = Resultado_casting >= Dificultad
```

Si el resultado es un **doble 6** (12 en 2D6) → **Irresistible Force**, hechizo impacta siempre, el caster corre riesgo de miscast.

## Dispel

Para despelar un hechizo:

```
Resultado_dispel = 2D6 (gastás 2DD)
Éxito = Resultado_dispel >= Resultado_casting
```

**Bonus:** +2 al resultado del dispel si el hechizo es de tu **lore** (escuela de magia del Wizard que despela).

## Tipos de hechizo

| Tipo | Descripción | Cómo se dispela |
|---|---|---|
| **Buff** (sigue a la unidad) | +1T, +1Sv, etc. | Dispel normal, o "dispel directo" (gastás DD sin tirar) |
| **Hex** (dura hasta que se dispel) | -1Ld, -1WS, etc. | Dispel normal |
| **Direct damage** | Daño inmediato (1D6 hits, 2D6 hits, etc.) | Dispel normal; si no, herida normal |
| **Augment** (instantáneo) | +1A, re-roll hits, etc. | No se dispela (ya impactó) |
| **Hex range** | Hechizos que afectan a 24" (Lightning, Fireball) | Dispel normal |

## Lore matching

Cada Wizard tiene una **lore** (escuela de magia) y obtiene **+2 al dispel** contra hechizos de la misma lore.

Ejemplo: un Wizard de **Heavens** castea "Comet of Casandora". Un Wizard de **Heavens** del rival intenta despelar → tira 2D6, +2 al resultado.

## Probabilidades útiles (para el AI)

- **2DD con +2** vs hechizo nivel 4 (casteo mínimo 8): 7+ en al menos 1 dado = 16.7%
- **2DD sin bonus** vs hechizo nivel 2 (casteo mínimo 4): 5+ en al menos 1 dado = 75%
- **4DD con +2** vs hechizo nivel 4: ~58% de éxito
- **Dispel directo** (gastar DD sin tirar): exitoso siempre, pero consume 1DD por nivel del hechizo

## Erratas importantes

- **Dispel "domiciliario"** (dispelar dentro de la zona de combate del spell): reglas especiales según el hechizo.
- **Hexes sobre la misma unidad**: stack? según el hechizo. Algunos no stackan.
- **Miscast**: 2D6 + nivel del Wizard, en tabla de miscast (efectos negativos que van desde perder un Wizard hasta una explosión mágica).

## Implementación en Dobleuno

- `magic-helper.ts` (Ola 4) genera dados, calcula probabilidades de cast/dispel, sugiere estrategia.
- UI: panel lateral con dados restantes, hechizos casteados/dispelados, log.
- Botones rápidos: "Castear X", "Dispelar Y", "Generar dados", "Miscast en X".

## Referencia TOW

- *Fuente: Reglamento TOW · Magic Phase · Dispel · Miscast*
- *Fuente: tow.whfb.app / Magic / Dispel / Miscast Tables*
