# Mecánica — Resolución de Combate (TOW)

> Referencia para el rules oracle. Datos codificados en `apps/web/src/lib/combat-math.ts` (Ola 4).

## Flujo

1. **Combate se declara** cuando una unidad carga o es cargada.
2. **En la fase de combate**, ambos bandos atacan en orden de Iniciativa.
3. **Se suman los resultados** y se calcula el "combat result" (CR).
4. **El bando perdedor** toma un break test (Ld, con modificadores).
5. Si falla → la unidad huye. Si pasa → sigue en combate.

## Combat Resolution (CR)

El CR se calcula como:

```
CR_atacante = wounds_inflicted + rank_bonus + standard + outnumber + flank + rear + charge + otros
CR_defensor = wounds_inflicted + rank_bonus + standard + outnumber + flank + rear + charge + otros
CR_diff = CR_atacante - CR_defensor
```

### Componentes del CR

| Componente | Valor | Notas |
|---|---|---|
| **Wounds inflicted** | +1 por wound no salvado | del bando contrario |
| **Rank bonus** | +1 por rank completo después del primero | hasta el máximo de la unidad (típico +3) |
| **Standard** | +1 si tenés estandarte | y no está en combate con la unidad |
| **Musician** | +1 si tenés músico y rival no | para tie-breakers |
| **Outnumber** | +1 si tenés más modelos que el rival | por al menos 1 |
| **Flank** | +1 por cada unidad que ataque el flanco | no suma si ya están en el frente |
| **Rear** | +1 por cada unidad que ataque la retaguardia | no suma si ya están en el frente |
| **Charge** | +1 si la unidad cargó este turno | solo el bando que cargó |

### Tie-breaker

Si el CR es 0-0:
- Quien tenga **más wounds inflicted** gana.
- Si persiste, quien tenga **más ranks**.
- Si persiste, quien tenga **estandarte**.
- Si persiste, **musician bonus** (si lo tiene).
- Si persiste, **el que cargó** gana (en su turno).

## Break test

El bando perdedor hace un test de Liderazgo:

```
Ld_test = Ld_base + modificadores
  + BSB nearby (a 12")  → +1
  + Musician in unit     → +1
  + Allá dentro de la unidad, en rango de mando del General (12") → +1
  + War banner nearby    → +1
  - Miedo al enemigo     → -1
  - Terror (en charging) → -1
  - Frenzy si perdés     → -1
  ...
```

Si el dado es **mayor o igual** a Ld_test, la unidad mantiene posición. Si es **menor**, huye.

## Resolución probabilística (combat-math.ts)

Dobleuno usa simulaciones Monte Carlo (1000 iteraciones) para calcular:

- **Hits esperados** = attacks × P(hit) = attacks × (si WS_atacante >= WS_defensor → 1/2 sino 1/3 o 1/6 según diferencia)
- **Wounds esperados** = hits × P(wound) = según S vs T
- **Saves esperados** = wounds × P(save) = según armor + ward (con AP- de great weapon, etc.)
- **Casualties esperados** = wounds - saves
- **CR esperado** = wounds + rank + standard + outnumber + flank + rear + charge
- **P(win combat)** = % de simulaciones con CR > 0
- **P(break enemy)** = % de simulaciones con break test fallado

## Great weapons y similares

- **Great weapon** → +2S en combate, ignora armor saves (no ward saves).
- **Halberd** → +1S en combate, permite impactar primero si S_atacante < S_defensor.
- **Lance** → +2S si la unidad cargó (carga solamente).
- **Spear** → +1A en la primera fila si la unidad no cargó.
- **Sword** (espada común) → sin modificador.

## Ward saves

- **No stackan** entre sí: tomás la mejor.
- **Sí stackan** con armor saves.
- **Great weapons no las ignoran** (la ward es independiente de armor).

## Save stack ejemplo

```
Greatsword: S4, great weapon
vs
Knight: T4, 1+ armor, shield, barding, 5+ ward por Talisman

Save efectiva del Knight contra great weapon:
  armor save: ignorada (great weapon)
  shield: ignorado (great weapon)
  barding: ignorada (great weapon)
  ward save: 5+ (la única que queda)

→ Save final: 5+
```

## Referencia TOW

- *Fuente: Reglamento TOW · Close Combat Attacks · Combat Result · Break Tests*
- *Fuente: tow.whfb.app / Combat / Ward Saves / Great Weapons*
