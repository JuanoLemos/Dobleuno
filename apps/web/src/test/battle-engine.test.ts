/**
 * Tests del motor de batalla cliente (battle-engine).
 * Verifica la state machine de fases y helpers de log.
 */
import { describe, it, expect } from 'vitest';
import {
  PHASES,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  STATUS_LABELS,
  nextPhase,
  isLastPhaseOfTurn,
  isFirstPhaseOfTurn,
  makeLog,
} from '../lib/battle-engine.js';

describe('battle-engine — phases', () => {
  it('PHASES contiene las 6 fases esperadas en orden', () => {
    expect(PHASES).toEqual(['start', 'movement', 'magic', 'shooting', 'combat', 'end']);
  });

  it('PHASE_LABELS tiene label para cada fase', () => {
    for (const p of PHASES) {
      expect(PHASE_LABELS[p]).toBeTruthy();
    }
  });

  it('PHASE_DESCRIPTIONS tiene descripción para cada fase', () => {
    for (const p of PHASES) {
      expect(PHASE_DESCRIPTIONS[p]).toBeTruthy();
    }
  });

  it('nextPhase avanza secuencialmente y vuelve a start', () => {
    expect(nextPhase('start')).toBe('movement');
    expect(nextPhase('movement')).toBe('magic');
    expect(nextPhase('magic')).toBe('shooting');
    expect(nextPhase('shooting')).toBe('combat');
    expect(nextPhase('combat')).toBe('end');
    expect(nextPhase('end')).toBe('start'); // wrap
  });

  it('isLastPhaseOfTurn detecta end', () => {
    expect(isLastPhaseOfTurn('end')).toBe(true);
    expect(isLastPhaseOfTurn('combat')).toBe(false);
  });

  it('isFirstPhaseOfTurn detecta start', () => {
    expect(isFirstPhaseOfTurn('start')).toBe(true);
    expect(isFirstPhaseOfTurn('movement')).toBe(false);
  });
});

describe('battle-engine — statuses', () => {
  it('STATUS_LABELS tiene label para cada status', () => {
    const statuses = [
      'idle',
      'moving',
      'charging',
      'engaged',
      'fleeing',
      'pursuing',
      'reforming',
      'rallied',
      'destroyed',
    ] as const;
    for (const s of statuses) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });
});

describe('battle-engine — makeLog', () => {
  it('crea un log entry válido con id, timestamp y category', () => {
    const entry = makeLog(0, 'combat', 'Unit A won', 'combat');
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(entry.turn).toBe(0);
    expect(entry.phase).toBe('combat');
    expect(entry.text).toBe('Unit A won');
    expect(entry.category).toBe('combat');
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('acepta todas las categorías', () => {
    const cats = ['movement', 'magic', 'shooting', 'combat', 'psychology', 'command', 'system'] as const;
    for (const c of cats) {
      const e = makeLog(1, 'start', `event ${c}`, c);
      expect(e.category).toBe(c);
    }
  });
});