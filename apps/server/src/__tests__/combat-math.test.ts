/**
 * Tests del motor de combate Monte Carlo.
 * Verifica que las probabilidades devueltas están en rangos razonables.
 */
import { describe, it, expect } from 'vitest';
import { simulateCombat, computeBattleStats } from '../lib/combat-math.js';
import type { BattleUnit } from '@dobleuno/shared';

describe('Combat math — simulateCombat', () => {
  it('returns finite positive numbers', () => {
    const r = simulateCombat({
      attacker: { attacks: 2, ws: 4, s: 3, t: 3 },
      defender: { toughness: 3, save: '5+', models: 10, woundsPerModel: 1 },
      iterations: 200,
    });
    expect(r.expectedHits).toBeGreaterThan(0);
    expect(r.expectedWounds).toBeGreaterThanOrEqual(0);
    expect(r.expectedCasualties).toBeGreaterThanOrEqual(0);
    expect(r.winProbability).toBeGreaterThanOrEqual(0);
    expect(r.winProbability).toBeLessThanOrEqual(1);
  });

  it('strong attacker against weak defender has high win rate', () => {
    // 10 ataques, S5 vs T3 = wound on 2+, 5+ save vs no save (5+ is rough)
    const r = simulateCombat({
      attacker: { attacks: 10, ws: 4, s: 5, t: 3 },
      defender: { toughness: 3, save: '7+', models: 5, woundsPerModel: 1 },
      iterations: 300,
    });
    expect(r.winProbability).toBeGreaterThan(0.5);
  });

  it('weak attacker against tough defender has low win rate', () => {
    const r = simulateCombat({
      attacker: { attacks: 1, ws: 2, s: 3, t: 3 },
      defender: { toughness: 7, save: '3+', models: 20, woundsPerModel: 1 },
      iterations: 300,
    });
    expect(r.winProbability).toBeLessThan(0.3);
  });

  it('parses standard save notation (better save = fewer casualties)', () => {
    // Configuración que NO wpea en ninguna de las dos simulaciones,
    // para que la diferencia de saves sea directamente medible.
    //   toHit = 4+ (ws4 vs ws4), toWound = 4+ (s4 vs t4)
    //   Hits/round ≈ 2.5 (5 * 1/2), Wounds/round ≈ 1.25
    //   6+ save (5/6 fail) → ~1.04 casualties/round
    //   2+ save (1/6 fail) → ~0.21 casualties/round
    //   r2/r1 ≈ 0.2 (5x mejor save)
    const r1 = simulateCombat({
      attacker: { attacks: 5, ws: 4, s: 4, t: 4 },
      defender: { toughness: 4, save: '6+', models: 30, woundsPerModel: 1 },
      iterations: 600,
    });
    const r2 = simulateCombat({
      attacker: { attacks: 5, ws: 4, s: 4, t: 4 },
      defender: { toughness: 4, save: '2+', models: 30, woundsPerModel: 1 },
      iterations: 600,
    });
    // Better save = at least 50% fewer casualties
    expect(r2.expectedCasualties).toBeLessThan(r1.expectedCasualties * 0.5);
  });
});

describe('Combat math — computeBattleStats', () => {
  it('counts units by faction and status', () => {
    const units: BattleUnit[] = [
      {
        id: 'p1',
        ref: 'emp-state-troops',
        name: 'State Troops',
        faction: 'player',
        modelsCurrent: 8,
        modelsStart: 10,
        ranks: 3,
        status: 'engaged',
        woundsTaken: 2,
        activeEffects: [],
      },
      {
        id: 'o1',
        ref: 'bre-knights',
        name: 'Knights',
        faction: 'opponent',
        modelsCurrent: 3,
        modelsStart: 5,
        ranks: 2,
        status: 'fleeing',
        woundsTaken: 2,
        activeEffects: [],
      },
    ];
    const stats = computeBattleStats(units, []);
    expect(stats.totalUnits).toBe(2);
    expect(stats.unitsByFaction.player).toBe(1);
    expect(stats.unitsByFaction.opponent).toBe(1);
    expect(stats.unitsByStatus.engaged).toBe(1);
    expect(stats.unitsByStatus.fleeing).toBe(1);
    expect(stats.totalCasualties.player).toBe(2);
    expect(stats.totalCasualties.opponent).toBe(2);
  });

  it('counts combat and magic events from log', () => {
    const units: BattleUnit[] = [];
    const log = [
      { category: 'combat', text: 'Unit A won the combat' },
      { category: 'combat', text: 'Unit B lost and routs' },
      { category: 'magic', text: 'Wizard cast a spell' },
      { category: 'magic', text: 'Enemy dispel attempt' },
      { category: 'movement', text: 'moved forward' },
    ];
    const stats = computeBattleStats(units, log);
    expect(stats.combatsWon).toBe(1);
    expect(stats.combatsLost).toBe(1);
    expect(stats.spellsCast).toBe(1);
    expect(stats.spellsDispelled).toBe(1);
  });

  it('handles empty units and log gracefully', () => {
    const stats = computeBattleStats([], []);
    expect(stats.totalUnits).toBe(0);
    expect(stats.totalCasualties.player).toBe(0);
    expect(stats.combatsWon).toBe(0);
  });
});