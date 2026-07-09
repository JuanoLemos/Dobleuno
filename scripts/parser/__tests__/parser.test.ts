import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load as cheerioLoad } from 'cheerio';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = join(__dirname, 'fixtures');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

// Mirror of the parser logic from scripts/parse-tow.ts
// (kept in sync — the goal is to validate the parser concept with fixtures)

const UnitSchema = z.object({
  id: z.string(),
  faction: z.enum(['empire', 'bretonnia']),
  category: z.enum(['lord', 'hero', 'core', 'special', 'rare']),
  name: z.string(),
  M: z.number(),
  WS: z.number(),
  BS: z.number(),
  S: z.number(),
  T: z.number(),
  W: z.number(),
  I: z.number(),
  A: z.number(),
  Ld: z.number(),
  Sv: z.string(),
  weapons: z.array(z.string()),
  specialRules: z.array(z.string()),
  points: z.number(),
});

function parseUnitFixture(html: string, faction: 'empire' | 'bretonnia', slug: string) {
  const $ = cheerioLoad(html);
  const name = $('h1.unit-name').first().text().trim();
  const categoryText = $('.unit-category').first().text().trim().toLowerCase();
  const stats: Record<string, number | string> = {};
  $('table.unit-stats tr').each((_, tr) => {
    const key = $(tr).find('th').text().trim();
    const val = $(tr).find('td').text().trim();
    if (/^(M|WS|BS|S|T|W|I|A|Ld)$/.test(key)) {
      const n = Number.parseInt(val, 10);
      stats[key] = Number.isFinite(n) && val !== '' ? n : val;
    } else if (key === 'Sv') {
      stats.Sv = val; // Sv es string ("3+", "5+", etc.)
    }
  });
  const weapons = $('.weapons-list li')
    .map((_, el) => $(el).text().trim())
    .get();
  const specialRules = $('.special-rules-list li')
    .map((_, el) => $(el).text().trim())
    .get();
  const pointsText = $('.points-per-model').first().text().trim();
  const m = pointsText.match(/(\d+)\s*pts?/i);
  const points = m ? Number.parseInt(m[1]!, 10) : 0;

  return UnitSchema.parse({
    id: `${faction}-${slug}`,
    faction,
    category: categoryText,
    name,
    M: stats.M,
    WS: stats.WS,
    BS: stats.BS,
    S: stats.S,
    T: stats.T,
    W: stats.W,
    I: stats.I,
    A: stats.A,
    Ld: stats.Ld,
    Sv: stats.Sv,
    weapons,
    specialRules,
    points,
  });
}

describe('Parser — Greatswords (Empire, Core)', () => {
  const html = readFixture('greatswords.html');
  const parsed = parseUnitFixture(html, 'empire', 'greatswords');

  it('extrae nombre correcto', () => {
    expect(parsed.name).toBe('Grandes Espadachines');
  });

  it('extrae facción', () => {
    expect(parsed.faction).toBe('empire');
  });

  it('extrae categoría', () => {
    expect(parsed.category).toBe('core');
  });

  it('extrae stats completas', () => {
    expect(parsed.M).toBe(4);
    expect(parsed.WS).toBe(4);
    expect(parsed.BS).toBe(3);
    expect(parsed.S).toBe(3);
    expect(parsed.T).toBe(3);
    expect(parsed.W).toBe(1);
    expect(parsed.I).toBe(3);
    expect(parsed.A).toBe(1);
    expect(parsed.Ld).toBe(8);
    expect(parsed.Sv).toBe('3+');
  });

  it('extrae weapons', () => {
    expect(parsed.weapons).toHaveLength(2);
    expect(parsed.weapons[0]).toContain('Greatsword');
    expect(parsed.weapons[1]).toContain('Hand weapon');
  });

  it('extrae special rules', () => {
    expect(parsed.specialRules).toEqual(
      expect.arrayContaining(['State Troop', 'Drilled', 'Hatred (Chaos)']),
    );
  });

  it('extrae points per model', () => {
    expect(parsed.points).toBe(12);
  });
});

describe('Parser — Handgunners (Empire, Special)', () => {
  const html = readFixture('handgunners.html');
  const parsed = parseUnitFixture(html, 'empire', 'handgunners');

  it('extrae stats con BS 3 y Sv 5+', () => {
    expect(parsed.BS).toBe(3);
    expect(parsed.Sv).toBe('5+');
    expect(parsed.category).toBe('special');
  });

  it('extrae arma de rango con AP-2', () => {
    expect(parsed.weapons[0]).toContain('Handgun');
    expect(parsed.weapons[0]).toContain('AP-2');
  });
});

describe('Parser — Knights of the Realm (Bretonnia, Core)', () => {
  const html = readFixture('knights-of-the-realm.html');
  const parsed = parseUnitFixture(html, 'bretonnia', 'knights-of-the-realm');

  it('extrae stats de caballería pesada', () => {
    expect(parsed.faction).toBe('bretonnia');
    expect(parsed.M).toBe(8);
    expect(parsed.WS).toBe(4);
    expect(parsed.S).toBe(4);
    expect(parsed.T).toBe(4);
    expect(parsed.Sv).toBe('3+');
  });

  it('extrae Lance como arma principal', () => {
    expect(parsed.weapons.some((w) => w.includes('Lance'))).toBe(true);
  });

  it('marca como Cavalry', () => {
    expect(parsed.specialRules).toContain('Cavalry');
    expect(parsed.specialRules).toContain('Heavy Cavalry');
  });

  it('precio premium de caballero (27 pts)', () => {
    expect(parsed.points).toBe(27);
  });
});

describe('Parser — fixture inválido', () => {
  it('tira error cuando no hay nombre', () => {
    const bad = '<html><body><p>No unit here</p></body></html>';
    expect(() => parseUnitFixture(bad, 'empire', 'broken')).toThrow();
  });

  it('tira error cuando los stats están incompletos', () => {
    const incomplete = `
      <html>
        <body>
          <h1 class="unit-name">Test</h1>
          <span class="unit-faction">Empire</span>
          <span class="unit-category">Core</span>
          <table class="unit-stats">
            <tr><th>M</th><td>4</td></tr>
          </table>
        </body>
      </html>
    `;
    expect(() => parseUnitFixture(incomplete, 'empire', 'incomplete')).toThrow();
  });
});

describe('Parser — fixtures existen', () => {
  it('greatswords.html existe', () => {
    expect(() => readFixture('greatswords.html')).not.toThrow();
  });
  it('handgunners.html existe', () => {
    expect(() => readFixture('handgunners.html')).not.toThrow();
  });
  it('knights-of-the-realm.html existe', () => {
    expect(() => readFixture('knights-of-the-realm.html')).not.toThrow();
  });
  it('great-weapon.html existe', () => {
    expect(() => readFixture('great-weapon.html')).not.toThrow();
  });
  it('talisman-of-preservation.html existe', () => {
    expect(() => readFixture('talisman-of-preservation.html')).not.toThrow();
  });
});
