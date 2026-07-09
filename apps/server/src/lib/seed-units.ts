/**
 * Seed de unidades TOW para MVP demo.
 * Cuando el mirror de tow.whfb.app corra, se reemplaza este seed con los datos
 * scrapeados (Ola 2). Mientras tanto, esto da un set mínimo para que la app funcione.
 *
 * 5 unidades Empire + 3 Bretonia (suficiente para probar el list builder).
 */

import type { KBUnit } from '@dobleuno/shared';

export const SEED_UNITS: KBUnit[] = [
  // ─── EMPIRE ────────────────────────────────────────────────────────────
  {
    id: 'empire-general-of-the-empire',
    faction: 'empire',
    category: 'lord',
    name: 'General of the Empire',
    stats: { M: 4, WS: 6, BS: 3, S: 4, T: 4, W: 3, I: 5, A: 4, Ld: 9, Sv: '3+' },
    weapons: [
      { name: 'Great weapon', range: '—', strength: 4, armorPenetration: 1, rules: ['Two-handed'] },
    ],
    specialRules: ['Heavy Armour', 'Shield'],
    pointsPerModel: 95,
    minSize: 1,
    commandGroup: {},
    options: [
      { name: 'Barded warhorse', points: 18, description: 'Mount' },
      { name: 'Hand weapon + shield', points: 0 },
    ],
    source: { page: 'tow.whfb.app/army/empire/general-of-the-empire.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'empire-empire-captain',
    faction: 'empire',
    category: 'hero',
    name: 'Empire Captain',
    stats: { M: 4, WS: 6, BS: 3, S: 4, T: 4, W: 2, I: 5, A: 3, Ld: 8, Sv: '3+' },
    weapons: [{ name: 'Hand weapon', range: '—', strength: 4, armorPenetration: 0, rules: [] }],
    specialRules: ['Heavy Armour', 'Shield', 'BSB', 'Lidership 8'],
    pointsPerModel: 50,
    minSize: 1,
    commandGroup: {},
    options: [],
    source: { page: 'tow.whfb.app/army/empire/empire-captain.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'empire-greatswords',
    faction: 'empire',
    category: 'core',
    name: 'Greatswords',
    stats: { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8, Sv: '3+' },
    weapons: [
      { name: 'Greatsword', range: '—', strength: 3, armorPenetration: 1, rules: ['Two-handed', 'Strike Last'] },
      { name: 'Hand weapon', range: '—', strength: 3, armorPenetration: 0, rules: [] },
    ],
    specialRules: ['State Troop', 'Drilled', 'Hatred (Chaos)'],
    pointsPerModel: 12,
    minSize: 10,
    maxSize: 30,
    commandGroup: { champion: 12, standard: 12, musician: 6 },
    options: [],
    source: { page: 'tow.whfb.app/army/empire/greatswords.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'empire-handgunners',
    faction: 'empire',
    category: 'special',
    name: 'Handgunners',
    stats: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7, Sv: '5+' },
    weapons: [
      { name: 'Handgun', range: '24"', strength: 4, armorPenetration: 2, rules: ['Armour Bane', 'Move or Fire'] },
    ],
    specialRules: ['Skirmishers', 'Move or Fire'],
    pointsPerModel: 9,
    minSize: 10,
    maxSize: 20,
    commandGroup: { champion: 9, musician: 6 },
    options: [],
    source: { page: 'tow.whfb.app/army/empire/handgunners.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'empire-cannon',
    faction: 'empire',
    category: 'rare',
    name: 'Cannon',
    stats: { M: 0, WS: 0, BS: 0, S: 0, T: 7, W: 3, I: 0, A: 0, Ld: 0, Sv: '—' },
    weapons: [
      { name: 'Cannon', range: '60"', strength: 7, armorPenetration: 2, rules: ['Multiple Wounds (D3)', 'Artillery'] },
    ],
    specialRules: ['War Machine'],
    pointsFixed: 120,
    minSize: 1,
    commandGroup: { champion: 0, standard: 0, musician: 0 },
    options: [],
    source: { page: 'tow.whfb.app/army/empire/cannon.html', lastVerified: '2026-07-08' },
  },
  // ─── BRETONNIA ─────────────────────────────────────────────────────────
  {
    id: 'bretonnia-bretonnian-lord',
    faction: 'bretonnia',
    category: 'lord',
    name: 'Bretonnian Lord',
    stats: { M: 4, WS: 7, BS: 3, S: 4, T: 4, W: 3, I: 5, A: 4, Ld: 9, Sv: '3+' },
    weapons: [
      { name: 'Lance (cavalry)', range: '—', strength: 4, armorPenetration: 1, rules: ['Lance formation', 'Charge bonus'] },
      { name: 'Sword', range: '—', strength: 4, armorPenetration: 0, rules: [] },
    ],
    specialRules: ['Heavy Armour', 'Shield', 'Barded warhorse'],
    pointsPerModel: 90,
    minSize: 1,
    commandGroup: {},
    options: [
      { name: 'Royal Pegasus', points: 35, description: 'Flying mount' },
    ],
    source: { page: 'tow.whfb.app/army/bretonnia/bretonnian-lord.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'bretonnia-knights-of-the-realm',
    faction: 'bretonnia',
    category: 'core',
    name: 'Knights of the Realm',
    stats: { M: 8, WS: 4, BS: 3, S: 4, T: 4, W: 1, I: 3, A: 1, Ld: 8, Sv: '3+' },
    weapons: [
      { name: 'Lance (cavalry)', range: '—', strength: 4, armorPenetration: 1, rules: ['Lance formation', 'Charge bonus'] },
      { name: 'Sword', range: '—', strength: 4, armorPenetration: 0, rules: [] },
    ],
    specialRules: ['Cavalry', 'Heavy Cavalry'],
    pointsPerModel: 27,
    minSize: 5,
    maxSize: 20,
    commandGroup: { champion: 27, standard: 25, musician: 15 },
    options: [],
    source: { page: 'tow.whfb.app/army/bretonnia/knights-of-the-realm.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'bretonnia-men-at-arms',
    faction: 'bretonnia',
    category: 'core',
    name: 'Men-at-Arms',
    stats: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7, Sv: '5+' },
    weapons: [
      { name: 'Hand weapon', range: '—', strength: 3, armorPenetration: 0, rules: [] },
      { name: 'Pike (first rank)', range: '—', strength: 3, armorPenetration: 0, rules: ['+1A first rank'] },
    ],
    specialRules: ['Phalanx'],
    pointsPerModel: 4,
    minSize: 20,
    maxSize: 40,
    commandGroup: { champion: 4, standard: 6, musician: 4 },
    options: [],
    source: { page: 'tow.whfb.app/army/bretonnia/men-at-arms.html', lastVerified: '2026-07-08' },
  },
  {
    id: 'bretonnia-trebuchet',
    faction: 'bretonnia',
    category: 'rare',
    name: 'Field Trebuchet',
    stats: { M: 0, WS: 0, BS: 0, S: 0, T: 7, W: 3, I: 0, A: 0, Ld: 0, Sv: '—' },
    weapons: [
      { name: 'Stone', range: '12-60"', strength: 4, armorPenetration: 0, rules: ['Multiple Wounds (D6)', 'Artillery'] },
    ],
    specialRules: ['War Machine'],
    pointsFixed: 90,
    minSize: 1,
    commandGroup: {},
    options: [],
    source: { page: 'tow.whfb.app/army/bretonnia/field-trebuchet.html', lastVerified: '2026-07-08' },
  },
];

export function findUnitById(id: string): KBUnit | undefined {
  return SEED_UNITS.find((u) => u.id === id);
}
