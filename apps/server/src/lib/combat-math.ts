/**
 * Combat math: probabilidades Monte Carlo para combate TOW.
 * Ola 4.
 */

import type { BattleUnit } from '@dobleuno/shared';

export interface CombatInput {
  attacker: { attacks: number; ws: number; s: number; t: number };
  defender: { toughness: number; save: string; ward?: string; models: number; woundsPerModel: number };
  iterations?: number;
}

export interface CombatResult {
  expectedHits: number;
  expectedWounds: number;
  expectedSaves: number;
  expectedCasualties: number;
  winProbability: number;
  roundsToWipe: number;
}

function parseSave(s: string): number {
  // "3+" → 3, "—" → 7 (no save)
  const m = s.match(/^(\d+)\+$/);
  if (!m) return 7;
  return Number.parseInt(m[1]!, 10);
}

function toHit(ws: number, defenderWs: number): number {
  // TOW: 4+ si ws_atk >= ws_def, 5+ si ws_atk < ws_def
  return ws >= defenderWs ? 4 : 5;
}

function toWound(s: number, t: number): number {
  // TOW wound table: S vs T
  if (s >= 2 * t) return 2;
  if (s > t) return 3;
  if (s === t) return 4;
  if (s * 2 <= t) return 6;
  return 5;
}

function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Simula un combate Monte Carlo. Retorna promedios + win prob. */
export function simulateCombat(input: CombatInput): CombatResult {
  const iters = input.iterations ?? 1000;
  const toHitVal = toHit(input.attacker.ws, input.attacker.ws);
  const toWoundVal = toWound(input.attacker.s, input.defender.toughness);
  const saveNum = parseSave(input.defender.save);

  let totalHits = 0;
  let totalWounds = 0;
  let totalCasualties = 0;
  let attackerWins = 0;
  let totalRounds = 0;

  for (let it = 0; it < iters; it++) {
    let defenderModels = input.defender.models;
    let hits = 0;
    let wounds = 0;
    const maxRounds = 6; // hard cap for simulation
    for (let round = 0; round < maxRounds && defenderModels > 0; round++) {
      hits = 0;
      wounds = 0;
      for (let a = 0; a < input.attacker.attacks; a++) {
        if (d6() >= toHitVal) hits++;
      }
      for (let w = 0; w < hits; w++) {
        if (d6() >= toWoundVal) wounds++;
      }
      // Wound save
      for (let s = 0; s < wounds; s++) {
        if (d6() < saveNum) {
          // save failed → casualty
          if (defenderModels > 0) {
            defenderModels -= 1;
            totalCasualties++;
          }
        }
      }
      if (defenderModels <= 0) {
        attackerWins++;
        totalRounds += round + 1;
        break;
      }
    }
    if (defenderModels > 0) {
      totalRounds += maxRounds;
    }
    totalHits += hits;
    totalWounds += wounds;
  }

  return {
    expectedHits: totalHits / iters,
    expectedWounds: totalWounds / iters,
    expectedSaves: 0, // simplified
    expectedCasualties: totalCasualties / iters,
    winProbability: attackerWins / iters,
    roundsToWipe: totalRounds / iters,
  };
}

/** Calcula estadísticas agregadas del estado de batalla. */
export interface BattleStats {
  totalUnits: number;
  unitsByFaction: { player: number; opponent: number };
  unitsByStatus: Record<string, number>;
  totalCasualties: { player: number; opponent: number };
  combatsWon: number;
  combatsLost: number;
  spellsCast: number;
  spellsDispelled: number;
  avgCombatResult: number;
}

export function computeBattleStats(
  units: BattleUnit[],
  log: { category: string; text: string }[]
): BattleStats {
  const stats: BattleStats = {
    totalUnits: units.length,
    unitsByFaction: { player: 0, opponent: 0 },
    unitsByStatus: {},
    totalCasualties: { player: 0, opponent: 0 },
    combatsWon: 0,
    combatsLost: 0,
    spellsCast: 0,
    spellsDispelled: 0,
    avgCombatResult: 0,
  };

  for (const u of units) {
    stats.unitsByFaction[u.faction]++;
    stats.unitsByStatus[u.status] = (stats.unitsByStatus[u.status] ?? 0) + 1;
    const lost = u.modelsStart - u.modelsCurrent;
    stats.totalCasualties[u.faction] += lost;
  }

  for (const e of log) {
    if (e.category === 'combat') {
      if (e.text.includes('won') || e.text.includes('wins')) stats.combatsWon++;
      if (e.text.includes('lost') || e.text.includes('routs')) stats.combatsLost++;
    }
    if (e.category === 'magic') {
      if (e.text.includes('cast')) stats.spellsCast++;
      if (e.text.includes('dispel')) stats.spellsDispelled++;
    }
  }

  return stats;
}
