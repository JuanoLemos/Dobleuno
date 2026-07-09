/**
 * Tipos compartidos del módulo de prompts.
 * Ola 0.5 — Prompt v0.1
 */

export type GamePhase =
  | 'start'
  | 'movement'
  | 'magic'
  | 'shooting'
  | 'combat'
  | 'end';

export interface UnitState {
  id: string;
  name: string;
  faction: string;
  models: number;
  startingModels: number;
  rank?: number;
  status: 'engaged' | 'fleeing' | 'reforming' | 'pursuing' | 'charging' | 'idle';
  position?: { x: number; y: number };
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  activePlayer: 'player' | 'opponent';
  units: UnitState[];
  spellsInPlay?: string[];
  terrain?: string[];
}

export interface ArmyListSummary {
  faction: string;
  totalPoints: number;
  units: Array<{ name: string; points: number; category: 'lord' | 'hero' | 'core' | 'special' | 'rare' }>;
  magicItems?: string[];
}

export interface PromptContext {
  playerName?: string;
  phase?: GamePhase;
  turnNumber?: number;
  gameState?: GameState;
  playerArmy?: ArmyListSummary;
  opponentArmy?: ArmyListSummary;
  houseRules?: string[];
  turnLog?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskRequest {
  question: string;
  context?: PromptContext;
  history?: ChatMessage[];
}

export interface Citation {
  raw: string;
  source: 'regulation' | 'faq' | 'errata' | 'tow_whfb' | 'unknown';
  matched: boolean;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  confidence: 'high' | 'medium' | 'low' | 'rejected';
  latencyMs: number;
  model: string;
  promptVersion: string;
}
