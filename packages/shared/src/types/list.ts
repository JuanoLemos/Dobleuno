export type FactionId = 'empire' | 'bretonnia';

export type UnitCategory = 'lord' | 'hero' | 'core' | 'special' | 'rare';

export interface MagicItem {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare';
  points: number;
  description: string;
  factionRestriction?: FactionId[];
  characterRestriction?: ('lord' | 'hero')[];
}

export interface UnitOption {
  id: string;
  name: string;
  points: number;
}

export interface ListUnit {
  id: string;
  ref: string; // ref to KB unit
  name: string;
  category: UnitCategory;
  points: number;
  models?: number;
  commandGroup?: {
    champion?: boolean;
    standard?: boolean;
    musician?: boolean;
  };
  options: UnitOption[];
  magicItems: string[]; // magicItem ids
  notes?: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  faction: FactionId;
  totalPoints: number;
  units: ListUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface ListValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  breakdown: {
    lords: { points: number; max: number; units: number };
    heroes: { points: number; max: number; units: number };
    core: { points: number; min: number; units: number };
    special: { points: number; max: number; units: number };
    rare: { points: number; max: number; units: number };
  };
}

export interface ValidationError {
  rule: string;
  message: string;
  affected: string[]; // unit ids
}

export interface ValidationWarning {
  rule: string;
  message: string;
  affected: string[];
}
