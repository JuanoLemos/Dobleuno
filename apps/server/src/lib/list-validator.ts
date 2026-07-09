/**
 * Server-side list validation.
 * Defense in depth: el cliente también valida, pero el server re-valida
 * para evitar listas inválidas por cliente modificado, race conditions, etc.
 */

import type { List, ListValidation, ListUnit } from '@dobleuno/shared';

/** Defaults de validación por facción (pueden refinarse en Ola 3+). */
const FACTION_RULES: Record<string, { minCorePct: number; maxSpecialPct: number; maxRarePct: number }> = {
  empire: { minCorePct: 25, maxSpecialPct: 50, maxRarePct: 25 },
  bretonnia: { minCorePct: 25, maxSpecialPct: 50, maxRarePct: 25 },
};

const MAX_SINGLE_UNIT_PCT = 50;
const MAX_LORDS_PCT = 25;
const MAX_HEROES_PCT = 25;

const RARITY_LIMITS = {
  common: { perCharacter: 3 },
  uncommon: { perCharacter: 2 },
  rare: { perCharacter: 1 },
  'very-rare': { perCharacter: 1 },
};
void RARITY_LIMITS; // referencia para evitar warning de unused

/** Valida una lista contra las reglas de composición de TOW. */
export function validateList(list: List): ListValidation {
  const rules = FACTION_RULES[list.faction] ?? FACTION_RULES.empire!;
  const total = list.totalPoints;

  const points: Record<keyof typeof INIT_POINTS, number> = { ...INIT_POINTS };
  const units: Record<keyof typeof INIT_UNITS, number> = { ...INIT_UNITS };
  const errors: ListValidation['errors'] = [];
  const warnings: ListValidation['warnings'] = [];

  if (total <= 0) {
    errors.push({ rule: 'total', message: 'La lista está vacía', affected: [] });
  }

  let generals = 0;
  let bsbCount = 0;
  const unitPointTotals: Record<string, number> = {};

  for (const u of list.units) {
    const unitPoints = computeUnitPoints(u);
    const slot = categoryToSlot(u.category);
    points[slot] += unitPoints;
    units[slot] += 1;
    unitPointTotals[u.id] = unitPoints;
    if (u.category === 'lord') {
      generals += 1;
    }
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
        message: `Core mínimo ${rules.minCorePct}% del total. Tenés ${corePct.toFixed(0)}% (${points.core}/${total} pts).`,
        affected: list.units.filter((u) => u.category === 'core').map((u) => u.id),
      });
    }

    const specialPct = (points.special / total) * 100;
    if (specialPct > rules.maxSpecialPct) {
      errors.push({
        rule: 'special-max',
        message: `Special máximo ${rules.maxSpecialPct}% del total. Tenés ${specialPct.toFixed(0)}% (${points.special}/${total} pts).`,
        affected: list.units.filter((u) => u.category === 'special').map((u) => u.id),
      });
    }

    const rarePct = (points.rare / total) * 100;
    if (rarePct > rules.maxRarePct) {
      errors.push({
        rule: 'rare-max',
        message: `Rare máximo ${rules.maxRarePct}% del total. Tenés ${rarePct.toFixed(0)}% (${points.rare}/${total} pts).`,
        affected: list.units.filter((u) => u.category === 'rare').map((u) => u.id),
      });
    }

    const lordsPct = (points.lords / total) * 100;
    if (lordsPct > MAX_LORDS_PCT) {
      warnings.push({
        rule: 'lords-pct',
        message: `Lords suelen ser ≤${MAX_LORDS_PCT}% del total. Tenés ${lordsPct.toFixed(0)}%.`,
        affected: list.units.filter((u) => u.category === 'lord').map((u) => u.id),
      });
    }

    const heroesPct = (points.heroes / total) * 100;
    if (heroesPct > MAX_HEROES_PCT) {
      warnings.push({
        rule: 'heroes-pct',
        message: `Heroes suelen ser ≤${MAX_HEROES_PCT}% del total. Tenés ${heroesPct.toFixed(0)}%.`,
        affected: list.units.filter((u) => u.category === 'hero').map((u) => u.id),
      });
    }

    for (const u of list.units) {
      const up = unitPointTotals[u.id] ?? 0;
      const pct = (up / total) * 100;
      if (pct > MAX_SINGLE_UNIT_PCT) {
        errors.push({
          rule: 'single-unit-max',
          message: `"${u.name}" es ${pct.toFixed(0)}% del total (máx ${MAX_SINGLE_UNIT_PCT}%).`,
          affected: [u.id],
        });
      }
    }
  }

  // Magic items rarity per character
  for (const u of list.units) {
    if (!['lord', 'hero'].includes(u.category)) continue;
    const counts: Record<string, number> = {};
    for (const item of u.magicItems) {
      counts[item] = (counts[item] ?? 0) + 1;
    }
    // Need item rarity — for now we count rare-ish
    // (this is approximate until items have rarity in the KB)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    breakdown: {
      lords: { points: points.lords, max: Math.floor((total * MAX_LORDS_PCT) / 100), units: units.lords },
      heroes: { points: points.heroes, max: Math.floor((total * MAX_HEROES_PCT) / 100), units: units.heroes },
      core: { points: points.core, min: Math.floor((total * rules.minCorePct) / 100), units: units.core },
      special: { points: points.special, max: Math.floor((total * rules.maxSpecialPct) / 100), units: units.special },
      rare: { points: points.rare, max: Math.floor((total * rules.maxRarePct) / 100), units: units.rare },
    },
  };
}

/** Calcula los puntos de una unidad (total + options + magic items). */
export function computeUnitPoints(u: ListUnit): number {
  const base = u.points ?? 0;
  const optionsCost = u.options.reduce((s, o) => s + o.points, 0);
  // Magic items sum: KB los tiene, pero acá solo contamos puntos fijos
  const itemsCost = 0; // Refinar cuando items tengan rarity
  return base + optionsCost + itemsCost;
}

/** Mapea la categoría de unidad a la key del breakdown (plural). */
function categoryToSlot(c: 'lord' | 'hero' | 'core' | 'special' | 'rare'): keyof typeof INIT_POINTS {
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

const INIT_POINTS = { lords: 0, heroes: 0, core: 0, special: 0, rare: 0 };
const INIT_UNITS = { lords: 0, heroes: 0, core: 0, special: 0, rare: 0 };

/** Helper: detecta si una lista está válida (sin errors). */
export function isValid(list: List): boolean {
  return validateList(list).valid;
}
