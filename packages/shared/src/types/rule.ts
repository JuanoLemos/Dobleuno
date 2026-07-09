import type { FactionId } from './list.js';

export interface WeaponProfile {
  name: string;
  range: string;
  strength: number;
  armorPenetration: number;
  rules: string[];
}

export interface UnitStats {
  M: number;
  WS: number;
  BS: number;
  S: number;
  T: number;
  W: number;
  I: number;
  A: number;
  Ld: number;
  Sv: string; // e.g. "3+"
}

export interface SpecialRule {
  name: string;
  description: string;
  category: 'combat' | 'shooting' | 'magic' | 'movement' | 'leadership' | 'equipment';
}

export interface KBUnit {
  id: string;
  faction: FactionId;
  category: 'lord' | 'hero' | 'core' | 'special' | 'rare';
  name: string;
  stats: UnitStats;
  weapons: WeaponProfile[];
  specialRules: string[]; // specialRule names
  pointsPerModel?: number;
  pointsFixed?: number;
  minSize: number;
  maxSize?: number;
  commandGroup: {
    champion?: number;
    standard?: number;
    musician?: number;
  };
  options: {
    name: string;
    points: number;
    description?: string;
  }[];
  magicItems?: string[]; // ids of available magic items
  source: {
    page: string;
    url?: string;
    lastVerified: string;
  };
}

export interface KnowledgeBaseChunk {
  id: string;
  content: string;
  source: 'regulation' | 'faq' | 'errata' | 'tow_whfb';
  reference: string;
  category: 'rule' | 'special-rule' | 'unit' | 'weapon' | 'magic-item' | 'scenario' | 'phase';
  embedding?: number[];
}

export interface KBFAQ {
  id: string;
  question: string;
  answer: string;
  citation: string;
  category: 'movement' | 'combat' | 'magic' | 'psychology' | 'list' | 'rules';
  tags: string[];
}

/**
 * Citation — chunk de KB referenciado en una respuesta del oracle RAG.
 * Lo que el LLM "citó" en su respuesta con el formato [cita:N].
 */
export interface Citation {
  ref: string;
  title: string;
  text: string; // preview (200 chars máx)
  source: 'unit' | 'rule' | 'item' | 'scenario' | 'faq';
}
