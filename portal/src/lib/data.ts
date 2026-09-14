/**
 * Loader de datos del portal.
 * Lee los JSON generados por `scripts/rules-sync.ts` desde `../data/` (o `src/data/` después del copy).
 * Si los datos no existen (build sin haber corrido el sync), devuelve arrays vacíos.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export interface TranslatedRule {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  category: string;
  source: { page: string; lastVerified: string };
}

export interface TranslatedItem {
  id: string;
  name: string;
  nameEs: string;
  rarity: string;
  points: number;
  description: string;
  descriptionEs: string;
  source: { page: string; lastVerified: string };
}

// src/ lives at portal/src/, we want to look in both
//   portal/src/data/  (post-copy)
//   ../data/translated/  (root del monorepo)
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL = resolve(__dirname, '..', 'data');
const ROOT_DATA = resolve(__dirname, '..', '..', 'data', 'translated');

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export function getRules(): TranslatedRule[] {
  const local = readJson<TranslatedRule[]>(join(LOCAL, 'special-rules.json'));
  if (local) return local;
  const root = readJson<TranslatedRule[]>(join(ROOT_DATA, 'special-rules.json'));
  return root ?? [];
}

export function getItems(): TranslatedItem[] {
  const local = readJson<TranslatedItem[]>(join(LOCAL, 'magic-items.json'));
  if (local) return local;
  const root = readJson<TranslatedItem[]>(join(ROOT_DATA, 'magic-items.json'));
  return root ?? [];
}

export function getRuleById(id: string): TranslatedRule | undefined {
  return getRules().find((r) => r.id === `rule-${id}` || r.id === id);
}

export function hasData(): boolean {
  return getRules().length > 0 || getItems().length > 0;
}

export function groupRulesByCategory(rules: TranslatedRule[]): Record<string, TranslatedRule[]> {
  const groups: Record<string, TranslatedRule[]> = {};
  for (const r of rules) {
    if (!groups[r.category]) groups[r.category] = [];
    groups[r.category]!.push(r);
  }
  return groups;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
