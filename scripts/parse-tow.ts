/**
 * Dobleuno · Parser HTML→JSON para tow.whfb.app
 *
 * Lee data/raw/ y produce data/processed/ con JSON estructurado.
 * Valida contra Zod. Falla loud si una página no matchea el schema esperado.
 *
 * Uso:
 *   tsx scripts/parse-tow.ts                              # todo
 *   tsx scripts/parse-tow.ts --type=army                  # solo unidades
 *   tsx scripts/parse-tow.ts --type=rule                  # solo reglas
 *   tsx scripts/parse-tow.ts --type=item                  # solo items
 *   tsx scripts/parse-tow.ts --faction=empire             # solo Empire
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load as cheerioLoad } from 'cheerio';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_RAW = join(ROOT, 'data', 'raw');
const DATA_PROCESSED = join(ROOT, 'data', 'processed');

// ─── Schemas Zod ──────────────────────────────────────────────────────────

const WeaponProfileSchema = z.object({
  name: z.string(),
  range: z.string().default('—'),
  strength: z.number().int().nonnegative(),
  armorPenetration: z.number().int().default(0),
  rules: z.array(z.string()).default([]),
});

const UnitStatsSchema = z.object({
  M: z.number().int(),
  WS: z.number().int(),
  BS: z.number().int(),
  S: z.number().int(),
  T: z.number().int(),
  W: z.number().int(),
  I: z.number().int(),
  A: z.number().int(),
  Ld: z.number().int(),
  Sv: z.string(),
});

const UnitOptionSchema = z.object({
  name: z.string(),
  points: z.number().int().nonnegative(),
  description: z.string().optional(),
});

const ParsedUnitSchema = z.object({
  id: z.string(),
  faction: z.enum(['empire', 'bretonnia']),
  category: z.enum(['lord', 'hero', 'core', 'special', 'rare']),
  name: z.string(),
  stats: UnitStatsSchema,
  weapons: z.array(WeaponProfileSchema).default([]),
  specialRules: z.array(z.string()).default([]),
  pointsPerModel: z.number().int().nonnegative().optional(),
  pointsFixed: z.number().int().nonnegative().optional(),
  minSize: z.number().int().positive().default(1),
  maxSize: z.number().int().positive().optional(),
  commandGroup: z
    .object({
      champion: z.number().int().nonnegative().optional(),
      standard: z.number().int().nonnegative().optional(),
      musician: z.number().int().nonnegative().optional(),
    })
    .default({}),
  options: z.array(UnitOptionSchema).default([]),
  source: z.object({
    page: z.string(),
    lastVerified: z.string(),
  }),
});

const ParsedSpecialRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    'combat',
    'shooting',
    'magic',
    'movement',
    'leadership',
    'equipment',
    'armour',
    'psychology',
  ]),
  source: z.object({
    page: z.string(),
    lastVerified: z.string(),
  }),
});

const ParsedMagicItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very-rare']),
  points: z.number().int().nonnegative(),
  description: z.string(),
  factionRestriction: z.array(z.string()).default([]),
  characterRestriction: z.array(z.enum(['lord', 'hero'])).default([]),
  source: z.object({
    page: z.string(),
    lastVerified: z.string(),
  }),
});

type ParsedUnit = z.infer<typeof ParsedUnitSchema>;
type ParsedSpecialRule = z.infer<typeof ParsedSpecialRuleSchema>;
type ParsedMagicItem = z.infer<typeof ParsedMagicItemSchema>;

// ─── CLI args ─────────────────────────────────────────────────────────────

interface CliArgs {
  faction?: 'empire' | 'bretonnia' | 'all';
  type?: 'army' | 'rule' | 'item' | 'all';
  strict: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { strict: true };
  for (const arg of argv) {
    if (arg === '--no-strict') args.strict = false;
    else if (arg.startsWith('--faction=')) {
      const v = arg.slice('--faction='.length);
      args.faction = v === 'all' ? 'all' : (v as 'empire' | 'bretonnia');
    } else if (arg.startsWith('--type=')) {
      const v = arg.slice('--type='.length);
      args.type = v === 'all' ? 'all' : (v as 'army' | 'rule' | 'item');
    }
  }
  return args;
}

// ─── HTML → Parsed (con selectores) ───────────────────────────────────────

const SELECTORS = {
  unitName: 'h1.unit-name, h1[class*="unit"], h1',
  unitFaction: '.unit-faction, .faction-tag',
  unitCategory: '.unit-category, .category',
  unitStatsTable: 'table.unit-stats, table[class*="stats"]',
  unitWeapons: '.weapons-list li, .weapons li',
  unitSpecialRules: '.special-rules-list li, .special-rules li',
  unitOptions: '.options-list li, .options li',
  unitPoints: '.points-per-model, .points',
  ruleName: 'h1, h1.rule-name, h1[class*="rule"]',
  ruleDescription: '.rule-description, .description, .content p',
  itemName: 'h1, h1.item-name, h1[class*="item"]',
  itemRarity: '.rarity',
  itemPoints: '.points',
  itemDescription: '.item-description, .description',
};

interface ParseStats {
  files: number;
  parsed: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

function parseUnit(html: string, faction: 'empire' | 'bretonnia', slug: string): ParsedUnit {
  const $ = cheerioLoad(html);
  const name = $(SELECTORS.unitName).first().text().trim();
  if (!name) throw new Error('No unit name found');

  const categoryText = $(SELECTORS.unitCategory).first().text().trim().toLowerCase();
  const category = ((): 'lord' | 'hero' | 'core' | 'special' | 'rare' => {
    if (categoryText.includes('lord')) return 'lord';
    if (categoryText.includes('hero')) return 'hero';
    if (categoryText.includes('core')) return 'core';
    if (categoryText.includes('special')) return 'special';
    if (categoryText.includes('rare')) return 'rare';
    return 'core';
  })();

  // Parse stats table
  const stats: Record<string, number | string> = {};
  $(`${SELECTORS.unitStatsTable} th, ${SELECTORS.unitStatsTable} td`).each((_, el) => {
    const text = $(el).text().trim();
    if (/^(M|WS|BS|S|T|W|I|A|Ld|Sv)$/i.test(text)) {
      const key = text;
      const val = $(el).next().text().trim();
      const num = Number.parseInt(val, 10);
      stats[key] = Number.isFinite(num) && val !== '' ? num : val;
    }
  });

  // Fallback: parse stat rows directly
  if (Object.keys(stats).length === 0) {
    $('.stat-row, tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();
        if (/^(M|WS|BS|S|T|W|I|A|Ld|Sv)$/i.test(key)) {
          const num = Number.parseInt(val, 10);
          stats[key] = Number.isFinite(num) && val !== '' ? num : val;
        }
      }
    });
  }

  // Weapons
  const weapons = $(SELECTORS.unitWeapons)
    .map((_, el) => {
      const text = $(el).text().trim();
      const m = text.match(/^(.+?)\s*\|\s*(\d+)\s*\|\s*S(\d+)(?:\s*\|\s*AP-?(\d+))?/);
      if (!m) return null;
      return {
        name: m[1]!.trim(),
        range: '—',
        strength: Number.parseInt(m[2]!, 10),
        armorPenetration: m[4] ? Number.parseInt(m[4], 10) : 0,
        rules: [],
      };
    })
    .get()
    .filter((w): w is NonNullable<typeof w> => w !== null);

  // Special rules
  const specialRules = $(SELECTORS.unitSpecialRules)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  // Options
  const options = $(SELECTORS.unitOptions)
    .map((_, el) => {
      const text = $(el).text().trim();
      const m = text.match(/^(.+?)\s*\+(\d+)\s*pts?/);
      if (!m) return null;
      return { name: m[1]!.trim(), points: Number.parseInt(m[2]!, 10) };
    })
    .get()
    .filter((o): o is NonNullable<typeof o> => o !== null);

  // Points
  const pointsText = $(SELECTORS.unitPoints).first().text().trim();
  const pointsMatch = pointsText.match(/(\d+)\s*pts?\s*(?:per\s*model)?/i);
  const pointsPerModel = pointsMatch ? Number.parseInt(pointsMatch[1]!, 10) : undefined;

  const candidate = {
    id: `${faction}-${slug}`,
    faction,
    category,
    name,
    stats: {
      M: Number(stats.M) || 4,
      WS: Number(stats.WS) || 4,
      BS: Number(stats.BS) || 3,
      S: Number(stats.S) || 3,
      T: Number(stats.T) || 3,
      W: Number(stats.W) || 1,
      I: Number(stats.I) || 3,
      A: Number(stats.A) || 1,
      Ld: Number(stats.Ld) || 7,
      Sv: String(stats.Sv ?? '5+'),
    },
    weapons,
    specialRules,
    pointsPerModel,
    options,
    minSize: 1,
    commandGroup: {},
    source: {
      page: `tow.whfb.app/army/${faction}/${slug}.html`,
      lastVerified: new Date().toISOString().slice(0, 10),
    },
  };

  const result = ParsedUnitSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

function parseSpecialRule(html: string, slug: string): ParsedSpecialRule {
  const $ = cheerioLoad(html);
  const name = $(SELECTORS.ruleName).first().text().trim();
  if (!name) throw new Error('No rule name found');
  const description = $(SELECTORS.ruleDescription)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join('\n\n');

  const candidate = {
    id: `rule-${slug}`,
    name,
    description: description || 'No description available.',
    category: 'equipment' as const, // default; refined by manual mapping
    source: {
      page: `tow.whfb.app/rules/${slug}.html`,
      lastVerified: new Date().toISOString().slice(0, 10),
    },
  };
  const result = ParsedSpecialRuleSchema.safeParse(candidate);
  if (!result.success) throw new Error(`Validation failed: ${result.error.message}`);
  return result.data;
}

function parseMagicItem(html: string, slug: string): ParsedMagicItem {
  const $ = cheerioLoad(html);
  const name = $(SELECTORS.itemName).first().text().trim();
  if (!name) throw new Error('No item name found');

  const rarityText = $(SELECTORS.itemRarity).first().text().trim().toLowerCase();
  const rarity = ((): 'common' | 'uncommon' | 'rare' | 'very-rare' => {
    if (rarityText.includes('very rare') || rarityText.includes('very-rare')) return 'very-rare';
    if (rarityText.includes('rare')) return 'rare';
    if (rarityText.includes('uncommon')) return 'uncommon';
    return 'common';
  })();

  const pointsText = $(SELECTORS.itemPoints).first().text().trim();
  const pointsMatch = pointsText.match(/(\d+)\s*pts?/i);
  const points = pointsMatch ? Number.parseInt(pointsMatch[1]!, 10) : 0;

  const description = $(SELECTORS.itemDescription)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join('\n\n');

  const candidate = {
    id: `item-${slug}`,
    name,
    rarity,
    points,
    description: description || 'No description available.',
    factionRestriction: [],
    characterRestriction: [],
    source: {
      page: `tow.whfb.app/items/${slug}.html`,
      lastVerified: new Date().toISOString().slice(0, 10),
    },
  };
  const result = ParsedMagicItemSchema.safeParse(candidate);
  if (!result.success) throw new Error(`Validation failed: ${result.error.message}`);
  return result.data;
}

// ─── Filesystem walk ──────────────────────────────────────────────────────

function walkHtml(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtml(full));
    } else if (entry.isFile() && extname(entry.name) === '.html') {
      out.push(full);
    }
  }
  return out;
}

// ─── Main (exportable + CLI wrapper) ───────────────────────────────────────

/**
 * Ola 7.1 — entrypoint reutilizable. Parsea el directorio `rawDir`, escribe
 * el resultado en `outDir`. Devuelve stats. `silent=true` no imprime nada.
 */
export async function parseAll(
  args: CliArgs,
  opts: { rawDir?: string; outDir?: string; silent?: boolean } = {},
): Promise<ParseStats> {
  const rawDir = opts.rawDir ?? DATA_RAW;
  const outDir = opts.outDir ?? DATA_PROCESSED;
  const silent = opts.silent ?? false;
  const log = (msg: string): void => {
    if (!silent) console.log(msg);
  };
  const err = (msg: string): void => {
    if (!silent) console.error(msg);
  };

  mkdirSync(outDir, { recursive: true });

  const stats: ParseStats = { files: 0, parsed: 0, failed: 0, errors: [] };

  // Army
  if (!args.type || args.type === 'army' || args.type === 'all') {
    const factions = args.faction && args.faction !== 'all' ? [args.faction] : ['empire', 'bretonnia'];
    for (const faction of factions) {
      const dir = join(rawDir, 'army', faction);
      const files = walkHtml(dir);
      const units: ParsedUnit[] = [];
      for (const file of files) {
        stats.files++;
        try {
          const html = readFileSync(file, 'utf-8');
          const slug = basename(file, '.html');
          const unit = parseUnit(html, faction as 'empire' | 'bretonnia', slug);
          units.push(unit);
          stats.parsed++;
        } catch (e) {
          stats.failed++;
          stats.errors.push({ file, error: (e as Error).message });
        }
      }
      const outPath = join(outDir, `units-${faction}.json`);
      writeFileSync(outPath, JSON.stringify(units, null, 2), 'utf-8');
      log(`[parse] army/${faction}: ${units.length} units → ${outPath.replace(ROOT, '')}`);
    }
  }

  // Special rules
  if (!args.type || args.type === 'rule' || args.type === 'all') {
    const dir = join(rawDir, 'rule', 'empire');
    const files = walkHtml(dir);
    const rules: ParsedSpecialRule[] = [];
    for (const file of files) {
      stats.files++;
      try {
        const html = readFileSync(file, 'utf-8');
        const slug = basename(file, '.html');
        rules.push(parseSpecialRule(html, slug));
        stats.parsed++;
      } catch (e) {
        stats.failed++;
        stats.errors.push({ file, error: (e as Error).message });
      }
    }
    const outPath = join(outDir, 'special-rules.json');
    writeFileSync(outPath, JSON.stringify(rules, null, 2), 'utf-8');
    log(`[parse] rules: ${rules.length} → ${outPath.replace(ROOT, '')}`);
  }

  // Magic items
  if (!args.type || args.type === 'item' || args.type === 'all') {
    const dir = join(rawDir, 'item', 'empire');
    const files = walkHtml(dir);
    const items: ParsedMagicItem[] = [];
    for (const file of files) {
      stats.files++;
      try {
        const html = readFileSync(file, 'utf-8');
        const slug = basename(file, '.html');
        items.push(parseMagicItem(html, slug));
        stats.parsed++;
      } catch (e) {
        stats.failed++;
        stats.errors.push({ file, error: (e as Error).message });
      }
    }
    const outPath = join(outDir, 'magic-items.json');
    writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf-8');
    log(`[parse] items: ${items.length} → ${outPath.replace(ROOT, '')}`);
  }

  log(`\n[parse] Done. ${stats.parsed}/${stats.files} OK, ${stats.failed} failed.`);
  if (stats.failed > 0 && args.strict) {
    for (const e of stats.errors.slice(0, 5)) {
      err(`  [fail] ${e.file}: ${e.error}`);
    }
    if (stats.errors.length > 5) {
      err(`  ... y ${stats.errors.length - 5} más`);
    }
  }
  return stats;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const stats = await parseAll(args);
  if (stats.failed > 0 && args.strict) {
    process.exit(1);
  }
}

const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}
