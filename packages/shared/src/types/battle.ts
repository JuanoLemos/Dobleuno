export type GamePhase = 'start' | 'movement' | 'magic' | 'shooting' | 'combat' | 'end';

export type UnitStatus =
  | 'idle'
  | 'moving'
  | 'charging'
  | 'engaged'
  | 'fleeing'
  | 'pursuing'
  | 'reforming'
  | 'rallied'
  | 'destroyed';

export interface BattleUnit {
  id: string;
  ref: string; // ref to list unit
  name: string;
  faction: 'player' | 'opponent';
  modelsCurrent: number;
  modelsStart: number;
  ranks: number;
  status: UnitStatus;
  position?: { x: number; y: number };
  woundsTaken: number;
  activeEffects: string[];
}

export interface BattleState {
  id: string;
  userId: string;
  name: string;
  scenario: string;
  playerListId: string;
  opponentListId?: string;
  opponentArmySummary?: string;
  terrain: string[];
  turn: number;
  phase: GamePhase;
  activePlayer: 'player' | 'opponent';
  units: BattleUnit[];
  log: BattleLogEntry[];
  status: 'setup' | 'deployment' | 'in-progress' | 'finished';
  winner?: 'player' | 'opponent' | 'draw';
  startedAt: string;
  finishedAt?: string;
  updatedAt: string;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  phase: GamePhase;
  timestamp: string;
  text: string;
  category: 'movement' | 'magic' | 'shooting' | 'combat' | 'psychology' | 'command' | 'system';
}
