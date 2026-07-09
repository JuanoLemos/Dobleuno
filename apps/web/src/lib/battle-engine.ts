/**
 * Cliente: motor de batalla (state machine + helpers de phase).
 * Ola 4.
 */
import type { BattleState, GamePhase, UnitStatus } from '@dobleuno/shared';

export const PHASES: GamePhase[] = ['start', 'movement', 'magic', 'shooting', 'combat', 'end'];

export const PHASE_LABELS: Record<GamePhase, string> = {
  start: 'Inicio',
  movement: 'Movimiento',
  magic: 'Magia',
  shooting: 'Disparo',
  combat: 'Combate',
  end: 'Fin',
};

export const PHASE_DESCRIPTIONS: Record<GamePhase, string> = {
  start: 'Chequea efectos de inicio, spells persistentes, inspires.',
  movement: 'Mover unidades, declarar cargas.',
  magic: 'Generar dados de magia, castear hechizos, despelar.',
  shooting: 'Unidades con armas de rango disparan.',
  combat: 'Resolver combates cuerpo a cuerpo (una a la vez).',
  end: 'Chequea psychology, inspires, limpia efectos.',
};

export const STATUS_LABELS: Record<UnitStatus, string> = {
  idle: 'Inactivo',
  moving: 'Moviendo',
  charging: 'Cargando',
  engaged: 'En combate',
  fleeing: 'Huyendo',
  pursuing: 'Persiguiendo',
  reforming: 'Reformando',
  rallied: 'Reagrupado',
  destroyed: 'Destruido',
};

export function nextPhase(phase: GamePhase): GamePhase {
  const i = PHASES.indexOf(phase);
  return PHASES[(i + 1) % PHASES.length] ?? 'start';
}

export function isLastPhaseOfTurn(phase: GamePhase): boolean {
  return phase === 'end';
}

export function isFirstPhaseOfTurn(phase: GamePhase): boolean {
  return phase === 'start';
}

/** Log entry helper. */
export function makeLog(
  turn: number,
  phase: GamePhase,
  text: string,
  category: 'movement' | 'magic' | 'shooting' | 'combat' | 'psychology' | 'command' | 'system'
): BattleState['log'][number] {
  return {
    id: crypto.randomUUID(),
    turn,
    phase,
    timestamp: new Date().toISOString(),
    text,
    category,
  };
}
