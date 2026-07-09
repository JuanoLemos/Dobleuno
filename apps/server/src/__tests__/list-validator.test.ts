/**
 * Tests del list-validator (server).
 */
import { describe, it, expect } from 'vitest';
import { validateList, computeUnitPoints } from '../lib/list-validator.js';
import type { List } from '@dobleuno/shared';

const baseList = (overrides: Partial<List> = {}): List => ({
  id: 'test',
  userId: 'user',
  name: 'Test list',
  faction: 'empire',
  totalPoints: 2000,
  units: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('computeUnitPoints', () => {
  it('suma base + options', () => {
    expect(
      computeUnitPoints({
        id: 'u1',
        ref: 'e-gs',
        name: 'Greatswords',
        category: 'core',
        points: 240,
        options: [
          { name: 'Champion', points: 12 },
          { name: 'Standard', points: 12 },
        ],
        magicItems: [],
      }),
    ).toBe(240 + 12 + 12);
  });

  it('una unidad sin options devuelve sus puntos', () => {
    expect(
      computeUnitPoints({
        id: 'u1',
        ref: 'e-cannon',
        name: 'Cannon',
        category: 'rare',
        points: 120,
        options: [],
        magicItems: [],
      }),
    ).toBe(120);
  });
});

describe('validateList', () => {
  it('lista vacía → error', () => {
    const result = validateList(baseList({ totalPoints: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === 'total')).toBe(true);
  });

  it('Empire 2000 pts válida (1 general, 1 captain, 4 core, 3 special, 2 rare) → ok', () => {
    const result = validateList(
      baseList({
        totalPoints: 2000,
        units: [
          // 1 Lord (95 pts)
          mkUnit('lord', 'empire-general', 95),
          // 1 Hero captain (50 pts)
          mkUnit('hero', 'empire-captain', 50),
          // 4 core: 4×150 = 600 pts (30% core)
          ...Array.from({ length: 4 }, () => mkUnit('core', 'empire-greatswords', 150)),
          // 3 special: 3×100 = 300 pts (15% special)
          ...Array.from({ length: 3 }, () => mkUnit('special', 'empire-handgunners', 100)),
          // 2 rare: 2×250 = 500 pts (25% rare)
          ...Array.from({ length: 2 }, () => mkUnit('rare', 'empire-cannon', 250)),
        ],
      }),
    );
    // Should pass core/special/rare/general
    expect(
      result.errors.filter((e) => ['core-min', 'special-max', 'rare-max', 'generals'].includes(e.rule)),
    ).toHaveLength(0);
  });

  it('detecta falta de core (< 25%)', () => {
    const result = validateList(
      baseList({
        totalPoints: 2000,
        units: [
          mkUnit('lord', 'empire-general', 95),
          mkUnit('hero', 'empire-captain', 50),
          mkUnit('core', 'empire-greatswords', 100),
          ...Array.from({ length: 5 }, () => mkUnit('special', 'empire-handgunners', 350)),
        ],
      }),
    );
    expect(result.errors.some((e) => e.rule === 'core-min')).toBe(true);
  });

  it('detecta exceso de special (> 50%)', () => {
    const result = validateList(
      baseList({
        totalPoints: 2000,
        units: [
          mkUnit('lord', 'empire-general', 95),
          mkUnit('core', 'empire-greatswords', 700),
          ...Array.from({ length: 5 }, () => mkUnit('special', 'empire-handgunners', 250)),
        ],
      }),
    );
    expect(result.errors.some((e) => e.rule === 'special-max')).toBe(true);
  });

  it('detecta 2 generals (debería ser 0-1)', () => {
    const result = validateList(
      baseList({
        totalPoints: 2000,
        units: [
          mkUnit('lord', 'empire-general', 95),
          mkUnit('lord', 'empire-general', 95),
          mkUnit('core', 'empire-greatswords', 1700),
        ],
      }),
    );
    expect(result.errors.some((e) => e.rule === 'generals')).toBe(true);
  });
});

function mkUnit(
  category: 'lord' | 'hero' | 'core' | 'special' | 'rare',
  ref: string,
  points: number,
  overrides: { models?: number } = {},
) {
  return {
    id: `${ref}-${Math.random().toString(36).slice(2, 7)}`,
    ref,
    name: ref,
    category,
    points,
    models: overrides.models,
    options: [],
    magicItems: [],
  };
}
