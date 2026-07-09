/**
 * Validación de composición de lista (TOW).
 * Versión cliente — la server también valida (defense in depth).
 */

import type { List, ListUnit, ListValidation } from '@dobleuno/shared';

const FACTION_RULES: Record<string, { minCorePct: number; maxSpecialPct: number; maxRarePct: number }> = {
  empire: { minCorePct: 25, maxSpecialPct: 50, maxRarePct: 25 },
  bretonnia: { minCorePct: 25, maxSpecialPct: 50, maxRarePct: 25 },
};

const MAX_SINGLE_UNIT_PCT = 50;

export function validateList(list: Pick<List, 'faction' | 'totalPoints' | 'units'>): ListValidation {
  const rules = FACTION_RULES[list.faction] ?? FACTION_RULES.empire!;
  const total = list.totalPoints;
  const points = { lords: 0, heroes: 0, core: 0, special: 0, rare: 0 };
  const units = { lords: 0, heroes: 0, core: 0, special: 0, rare: 0 };
  const errors: ListValidation['errors'] = [];
  const warnings: ListValidation['warnings'] = [];
  let generals = 0;
  let bsbCount = 0;
  const unitPointTotals: Record<string, number> = {};

  if (total <= 0 && list.units.length > 0) {
    errors.push({ rule: 'total', message: 'La lista no tiene puntos asignados', affected: [] });
  }

  for (const u of list.units) {
    const slot = categoryToSlot(u.category);
    const up = u.points ?? 0;
    points[slot] += up;
    units[slot] += 1;
    unitPointTotals[u.id] = up;
    if (u.category === 'lord') generals += 1;
    if (u.category === 'hero' && u.options.some((o) => /bsb|standard|battle standard/i.test(o.name))) {
      bsbCount += 1;
    }
  }

  if (generals > 1) {
    errors.push({
      rule: 'generals',
      message: `Solo se permite 1 General. Tenés ${generals}.`,
      affected: list.units.filter((u) => u.category === 'lord').map((u) => u.id),
    });
  }
  if (bsbCount > 1) {
    errors.push({
      rule: 'bsb',
      message: `Solo se permite 1 BSB. Tenés ${bsbCount}.`,
      affected: [],
    });
  }

  if (total > 0) {
    const corePct = (points.core / total) * 100;
    if (corePct < rules.minCorePct) {
      errors.push({
        rule: 'core-min',
        message: `Core ≥${rules.minCorePct}% (tenés ${corePct.toFixed(0)}%)`,
        affected: list.units.filter((u) => u.category === 'core').map((u) => u.id),
      });
    }
    const specialPct = (points.special / total) * 100;
    if (specialPct > rules.maxSpecialPct) {
      errors.push({
        rule: 'special-max',
        message: `Special ≤${rules.maxSpecialPct}% (tenés ${specialPct.toFixed(0)}%)`,
        affected: list.units.filter((u) => u.category === 'special').map((u) => u.id),
      });
    }
    const rarePct = (points.rare / total) * 100;
    if (rarePct > rules.maxRarePct) {
      errors.push({
        rule: 'rare-max',
        message: `Rare ≤${rules.maxRarePct}% (tenés ${rarePct.toFixed(0)}%)`,
        affected: list.units.filter((u) => u.category === 'rare').map((u) => u.id),
      });
    }
    for (const u of list.units) {
      const up = unitPointTotals[u.id] ?? 0;
      const pct = (up / total) * 100;
      if (pct > MAX_SINGLE_UNIT_PCT) {
        errors.push({
          rule: 'single-unit',
          message: `"${u.name}" es ${pct.toFixed(0)}% del total (máx ${MAX_SINGLE_UNIT_PCT}%)`,
          affected: [u.id],
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    breakdown: {
      lords: { points: points.lords, max: Math.floor((total * 25) / 100), units: units.lords },
      heroes: { points: points.heroes, max: Math.floor((total * 25) / 100), units: units.heroes },
      core: { points: points.core, min: Math.floor((total * rules.minCorePct) / 100), units: units.core },
      special: { points: points.special, max: Math.floor((total * rules.maxSpecialPct) / 100), units: units.special },
      rare: { points: points.rare, max: Math.floor((total * rules.maxRarePct) / 100), units: units.rare },
    },
  };
}

function categoryToSlot(c: ListUnit['category']): keyof typeof _INIT {
  switch (c) {
    case 'lord':
      return 'lords';
    case 'hero':
      return 'heroes';
    case 'core':
      return 'core';
    case 'special':
      return 'special';
    case 'rare':
      return 'rare';
  }
}

type Init = { lords: number; heroes: number; core: number; special: number; rare: number };
const _INIT: Init = { lords: 0, heroes: 0, core: 0, special: 0, rare: 0 };
void _INIT;

/** Total rápido de una lista sumando points de units + options. */
export function computeListTotal(list: List): number {
  return list.units.reduce((sum, u) => {
    const opt = u.options.reduce((s, o) => s + o.points, 0);
    return sum + (u.points ?? 0) + opt;
  }, 0);
}
