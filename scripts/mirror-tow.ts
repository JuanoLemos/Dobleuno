/**
 * Dobleuno · Mirror de tow.whfb.app
 *
 * Descarga HTML de las páginas de tow.whfb.app a data/raw/.
 * Respeta robots.txt, rate limit configurable, User-Agent identificable.
 *
 * Uso:
 *   tsx scripts/mirror-tow.ts                            # mirror todo (default)
 *   tsx scripts/mirror-tow.ts --faction=empire           # solo Empire
 *   tsx scripts/mirror-tow.ts --faction=bretonnia        # solo Bretonia
 *   tsx scripts/mirror-tow.ts --type=army                # solo unidades
 *   tsx scripts/mirror-tow.ts --type=rule                # solo reglas especiales
 *   tsx scripts/mirror-tow.ts --type=item                # solo items mágicos
 *   tsx scripts/mirror-tow.ts --rate-limit=2000          # 2s entre requests
 *   tsx scripts/mirror-tow.ts --dry-run                  # lista URLs sin descargar
 *   tsx scripts/mirror-tow.ts --force                    # re-descarga aunque exista
 *
 * Variables de entorno:
 *   TOW_BASE_URL   default: https://tow.whfb.app
 *   MIRROR_UA      default: Dobleuno/0.1 (+contact)
 *   MIRROR_DRY_RUN default: false
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_RAW = join(ROOT, 'data', 'raw');

const TOW_BASE_URL = process.env.TOW_BASE_URL ?? 'https://tow.whfb.app';
const USER_AGENT = process.env.MIRROR_UA ?? 'Dobleuno/0.1 (+https://github.com/JuanoLemos/Dobleuno)';
const DEFAULT_RATE_LIMIT_MS = 2000;

// ─── CLI args ─────────────────────────────────────────────────────────────

interface CliArgs {
  faction?: 'empire' | 'bretonnia' | 'all';
  type?: 'army' | 'rule' | 'item' | 'all';
  rateLimit: number;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    rateLimit: DEFAULT_RATE_LIMIT_MS,
    dryRun: false,
    force: false,
    verbose: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--verbose' || arg === '-v') args.verbose = true;
    else if (arg.startsWith('--faction=')) {
      const v = arg.slice('--faction='.length);
      args.faction = v === 'all' ? 'all' : (v as 'empire' | 'bretonnia');
    } else if (arg.startsWith('--type=')) {
      const v = arg.slice('--type='.length);
      args.type = v === 'all' ? 'all' : (v as 'army' | 'rule' | 'item');
    } else if (arg.startsWith('--rate-limit=')) {
      args.rateLimit = Number.parseInt(arg.slice('--rate-limit='.length), 10);
    }
  }
  return args;
}

// ─── URL manifest ─────────────────────────────────────────────────────────
// Lista de URLs a descargar. Configurable. Se puede alimentar desde
// un sitemap o desde un manifest local.

interface MirrorTarget {
  type: 'army' | 'rule' | 'item';
  faction: 'empire' | 'bretonnia';
  slug: string;
  url: string;
}

const ARMY_TARGETS: Record<string, string[]> = {
  empire: [
    'general-of-the-empire', 'empire-captain', 'empire-champion',
    'wizard-lord', 'battle-wizard', 'warrior-priest', 'witch-hunter',
    'empire-knights', 'inner-circle-knights', 'reiksguard',
    'demigryph-knights', 'greatswords', 'halberdiers', 'swordsmen',
    'spearmen', 'handgunners', 'crossbowmen', 'archers',
    'free-company-militia', 'flagellants', 'huntsmen',
    'pistoliers', 'outriders', 'empire-war-wagon',
    'helblaster-volley-gun', 'helstorm-rocket-battery',
    'cannon', 'mortar', 'empire-great-cannon', 'steam-tank',
    'karl-franz', 'ludwig-schwarzhelm', 'kurt-helborg',
    'balthasar-gelt', 'marius-leitdorf',
  ],
  bretonnia: [
    'bretonnian-lord', 'bretonnian-paladin', 'bretonnian-knight-errant',
    'bretonnian-wizard', 'bretonnian-damsel',
    'knights-of-the-realm', 'knights-errant', 'questing-knights',
    'grail-knights', 'grail-reliquary',
    'men-at-arms', 'peasant-bowmen', 'peasant-mob',
    'battle-pilgrims', 'squires', 'peasant-levy',
    'trebuchet', 'field-trebuchet',
    'louen-leoncour', 'the-green-knight',
  ],
};

const SPECIAL_RULE_TARGETS = [
  'great-weapon', 'halberd', 'lance', 'spear', 'sword', 'shield',
  'barding', 'light-armour', 'heavy-armour', 'full-plate-armour',
  'fear', 'terror', 'panic', 'hatred', 'frenzy', 'animosity', 'stupidity',
  'magic-resistance', 'ward-save', 'armour-save',
  'killing-blow', 'poisoned-attacks', 'strike-first', 'strike-last',
  'multiple-wounds', 'impact-hits', 'stomp',
  'regeneration', 'flying', 'ethereal', 'large-target', 'tall',
  'skirmishers', 'fast-cavalry', 'heavy-cavalry', 'light-cavalry',
  'drilled', 'martial-discipline', 'state-troop',
];

const MAGIC_ITEM_TARGETS = [
  'sword-of-battle', 'sword-of-might', 'sword-of-strength', 'sword-of-swiftness',
  'sword-of-anti-heroes', 'dagger-of-venom',
  'talisman-of-preservation', 'talisman-of-endurance',
  'armour-of-meteoric-iron', 'armour-of-silvered-steel',
  'enchanted-shield', 'shield-of-the-jade-lion',
  'ring-of-fury', 'ring-of-the-blood-fist',
  'banner-of-doom', 'banner-of-rage', 'banner-of-swiftness',
  'potion-of-strength', 'potion-of-healing',
  'ruby-ring-of-ruins', 'crown-of-command',
];

function buildTargets(args: CliArgs): MirrorTarget[] {
  const targets: MirrorTarget[] = [];

  // Army
  if (args.type === 'army' || args.type === 'all' || !args.type) {
    const factions = args.faction && args.faction !== 'all' ? [args.faction] : ['empire', 'bretonnia'];
    for (const faction of factions) {
      const slugs = ARMY_TARGETS[faction] ?? [];
      for (const slug of slugs) {
        targets.push({
          type: 'army',
          faction: faction as 'empire' | 'bretonnia',
          slug,
          url: `${TOW_BASE_URL}/army/${faction}/${slug}.html`,
        });
      }
    }
  }

  // Special rules
  if (args.type === 'rule' || args.type === 'all' || !args.type) {
    for (const slug of SPECIAL_RULE_TARGETS) {
      targets.push({
        type: 'rule',
        faction: 'empire', // special rules aren't faction-specific
        slug,
        url: `${TOW_BASE_URL}/rules/${slug}.html`,
      });
    }
  }

  // Magic items
  if (args.type === 'item' || args.type === 'all' || !args.type) {
    for (const slug of MAGIC_ITEM_TARGETS) {
      targets.push({
        type: 'item',
        faction: 'empire',
        slug,
        url: `${TOW_BASE_URL}/items/${slug}.html`,
      });
    }
  }

  return targets;
}

// ─── robots.txt check ─────────────────────────────────────────────────────

interface RobotsRule {
  isAllowed: (url: string) => boolean;
}

function parseRobotsTxt(content: string, userAgent: string): RobotsRule {
  const lines = content.split('\n').map((l) => l.trim());
  const groups: Array<{ agents: string[]; rules: string[] }> = [];
  let current: { agents: string[]; rules: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith('#') || !line) continue;
    const m = line.match(/^(User-agent|Disallow|Allow|Crawl-delay):\s*(.+)$/i);
    if (!m) continue;
    const [, key, value] = m;
    if (key.toLowerCase() === 'user-agent') {
      if (current && current.agents.length > 0) groups.push(current);
      current = { agents: [value.toLowerCase()], rules: [] };
    } else if (current) {
      current.rules.push(`${key} ${value}`);
    }
  }
  if (current && current.agents.length > 0) groups.push(current);

  const matching = groups.filter(
    (g) => g.agents.includes('*') || g.agents.includes(userAgent.toLowerCase()),
  );

  return {
    isAllowed: (url: string): boolean => {
      for (const group of matching) {
        for (const rule of group.rules) {
          const [type, path] = rule.split(' ');
          if (!path) continue;
          if (url.includes(path)) {
            return type.toLowerCase() === 'allow';
          }
        }
      }
      return true;
    },
  };
}

async function loadRobots(): Promise<RobotsRule> {
  try {
    const res = await fetch(`${TOW_BASE_URL}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      console.warn(`robots.txt no accesible (${res.status}), asumimos allow all`);
      return { isAllowed: () => true };
    }
    const content = await res.text();
    return parseRobotsTxt(content, USER_AGENT);
  } catch (err) {
    console.warn('robots.txt no se pudo descargar:', (err as Error).message);
    return { isAllowed: () => true };
  }
}

// ─── Mirror ───────────────────────────────────────────────────────────────

interface MirrorStats {
  attempted: number;
  downloaded: number;
  skipped: number;
  failed: number;
  bytes: number;
}

async function mirrorOne(
  target: MirrorTarget,
  args: CliArgs,
  robots: RobotsRule,
): Promise<{ status: 'ok' | 'skip' | 'fail'; bytes?: number; error?: string }> {
  const outPath = join(DATA_RAW, target.type, target.faction, `${target.slug}.html`);

  if (!args.force && existsSync(outPath)) {
    return { status: 'skip' };
  }

  if (!robots.isAllowed(target.url)) {
    return { status: 'fail', error: 'bloqueado por robots.txt' };
  }

  try {
    const res = await fetch(target.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en,es;q=0.9',
      },
    });
    if (!res.ok) {
      return { status: 'fail', error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf-8');
    return { status: 'ok', bytes: html.length };
  } catch (err) {
    return { status: 'fail', error: (err as Error).message };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const targets = buildTargets(args);

  console.log(`[mirror] Base URL: ${TOW_BASE_URL}`);
  console.log(`[mirror] Rate limit: ${args.rateLimit}ms entre requests`);
  console.log(`[mirror] User-Agent: ${USER_AGENT}`);
  console.log(`[mirror] Dry run: ${args.dryRun}`);
  console.log(`[mirror] Targets: ${targets.length}`);
  if (args.dryRun) {
    for (const t of targets.slice(0, 20)) {
      console.log(`  [dry-run] ${t.type}/${t.faction}/${t.slug} → ${t.url}`);
    }
    if (targets.length > 20) console.log(`  ... y ${targets.length - 20} más`);
    return;
  }

  const robots = await loadRobots();
  const stats: MirrorStats = { attempted: 0, downloaded: 0, skipped: 0, failed: 0, bytes: 0 };
  const t0 = performance.now();

  for (const target of targets) {
    stats.attempted++;
    const res = await mirrorOne(target, args, robots);
    if (res.status === 'ok') {
      stats.downloaded++;
      stats.bytes += res.bytes ?? 0;
      if (args.verbose) {
        console.log(`  [ok]   ${target.type}/${target.faction}/${target.slug} (${res.bytes} B)`);
      }
    } else if (res.status === 'skip') {
      stats.skipped++;
    } else {
      stats.failed++;
      console.error(`  [fail] ${target.type}/${target.faction}/${target.slug}: ${res.error}`);
    }
    // Rate limit
    if (stats.attempted < targets.length) {
      await sleep(args.rateLimit);
    }
  }

  const t1 = performance.now();
  const elapsed = ((t1 - t0) / 1000).toFixed(1);

  console.log(`\n[mirror] Done in ${elapsed}s`);
  console.log(`  attempted: ${stats.attempted}`);
  console.log(`  downloaded: ${stats.downloaded}`);
  console.log(`  skipped: ${stats.skipped} (ya existían)`);
  console.log(`  failed: ${stats.failed}`);
  console.log(`  bytes: ${(stats.bytes / 1024).toFixed(1)} KiB`);
  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
