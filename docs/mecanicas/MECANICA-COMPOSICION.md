# Mecánica — Composición de Ejército (TOW)

> Referencia para el rules oracle. Datos codificados en `apps/web/src/lib/list-validation.ts` (Ola 3).

## Slots de unidad

TOW usa 4 categorías de unidades, más personajes:

| Slot | Min % | Max % | Notas |
|---|---|---|---|
| **Lords** | 0% | ≤ 25% | General obligatorio (1, ≤25% del total) |
| **Heroes** | 0% | ≤ 25% | BSB opcional (0-1, no acumulable con General como BSB) |
| **Core** | ≥ 25% | sin tope | Tropa de línea |
| **Special** | 0% | ≤ 50% | Unidades especiales |
| **Rare** | 0% | ≤ 25% | Unidades raras (war machines, monsters grandes) |

**Reglas variables por ejército:** algunos ejércitos tienen reglas especiales (Dwarfs sin límite en Core, Bretonnia con Knights como Core, etc.). Se codifican en `apps/web/src/lib/list-validation.ts` por facción.

## Reglas de selección de unidades

- **0-1 General** obligatorio (de Lords).
- **0-1 Battle Standard Bearer (BSB)** en Heroes. Si el General ya porta el BSB, no se puede tener un BSB separado.
- **Una sola unidad** no puede superar el **50% del total** de puntos.
- **0-3 de cada Rare específica** en la mayoría de los ejércitos (war machines: 0-1, 0-2 según el tipo).
- **0-N de cada Special** según el ejército (típico 0-2 o 0-3).

## Magic items

Cada personaje puede llevar ítems mágicos. Límites por rareza:

| Rareza | Max por personaje | Notas |
|---|---|---|
| **Common** | hasta 3 | según ejército |
| **Uncommon** | hasta 2 | según ejército |
| **Rare** | 0-1 | muy restrictivo |
| **Very Rare** | 0-1 | muy restrictivo, solo en algunos ejércitos |

**Restricciones adicionales:** algunos ítems son de facción (no se pueden usar fuera de su ejército), algunos son mount-only, hero-only, lord-only, etc.

## Validación en Dobleuno

El validador de listas (`list-validation.ts`) corre en tiempo real mientras el usuario arma la lista:

- ✅ Verde: pasa todas las reglas
- ❌ Rojo: muestra qué regla viola y cómo arreglarla

Ejemplo de output:

```
Composición
  ✅ Lords: 350/500 pts (70%) — 1 General
  ✅ Heroes: 200/500 pts (40%) — 1 BSB
  ✅ Core: 700/2000 pts (35%) — 2 unidades
  ❌ Special: 800/1000 pts (80%) — muy alto
     └─ Solución: sacar 1 unidad Special o agregar 200 pts de Core
  ✅ Rare: 250/500 pts (50%) — 1 unidad

Items mágicos
  ✅ General: 1 común + 1 raro (válido)
  ❌ BSB: 2 raros + 1 uncommon
     └─ Solución: solo 0-1 raros por personaje
```

## Referencia TOW

- *Fuente: Reglamento TOW · Army Composition · FAQ oficial GW 2025-04*
- *Fuente: tow.whfb.app / Army Composition*
