#!/usr/bin/env node
/**
 * Bump version across all workspace package.json files.
 *
 * Usage:
 *   node scripts/bump-version.js           # 0.2.0 → 0.3.0 (minor)
 *   node scripts/bump-version.js major     # 0.2.0 → 1.0.0
 *   node scripts/bump-version.js minor     # 0.2.0 → 0.3.0 (default)
 *   node scripts/bump-version.js patch     # 0.2.0 → 0.2.1
 *   node scripts/bump-version.js 0.3.0     # explicit version
 *
 * Bumps version in:
 *   - apps/web/package.json
 *   - apps/server/package.json
 *   - packages/shared/package.json
 *   - root package.json (private, no publish, but kept in sync)
 *
 * Then:
 *   - Updates CHANGELOG.md with new version header
 *   - Creates git commit with all changes
 *   - Creates annotated tag v<version>
 *
 * Does NOT push. You do that.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const args = process.argv.slice(2);
const arg = args[0] ?? 'minor';

const PACKAGES = [
  join(ROOT, 'package.json'),
  join(ROOT, 'apps', 'web', 'package.json'),
  join(ROOT, 'apps', 'server', 'package.json'),
  join(ROOT, 'packages', 'shared', 'package.json'),
];

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJSON(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Explicit version
      if (/^\d+\.\d+\.\d+/.test(type)) {
        return type;
      }
      throw new Error(`Invalid bump type: ${type}. Use major, minor, patch, or explicit semver.`);
  }
}

export const UNRELEASED_PLACEHOLDER = '_Nada sin versionar todavía._';

const UNRELEASED_RE = /^## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[)/m;

/**
 * Mueve el contenido de [Unreleased] a una sección de versión nueva, y deja
 * [Unreleased] vacío arriba.
 *
 * Antes esto descartaba el contenido: reemplazaba el bloque entero por
 * "_Próxima ola._", así que todo lo anotado entre releases se perdía al bumpear.
 */
export function rollUnreleased(changelog, header) {
  const match = changelog.match(UNRELEASED_RE);

  // Sin sección [Unreleased]: insertamos la versión antes de la primera que haya.
  if (!match) {
    return changelog.replace(/(?=^## \[)/m, `${header}\n\n_Próxima ola._\n\n---\n\n`);
  }

  // El --- que cierra el bloque es del layout, no del contenido.
  const body = (match[1] ?? '').replace(/\n*-{3,}\s*$/, '').trim();
  const moved = body === '' || body === UNRELEASED_PLACEHOLDER ? '_Próxima ola._' : body;

  return changelog.replace(
    UNRELEASED_RE,
    `## [Unreleased]\n\n${UNRELEASED_PLACEHOLDER}\n\n---\n\n${header}\n\n${moved}\n\n`,
  );
}

function main() {
  // 1. Read current version from root
  const rootPkg = readJSON(PACKAGES[0]);
  const current = rootPkg.version;
  const next = bumpVersion(current, arg);
  console.log(`Bumping version: ${current} → ${next}`);

  // 2. Bump all package.json files
  for (const pkgPath of PACKAGES) {
    const pkg = readJSON(pkgPath);
    pkg.version = next;
    writeJSON(pkgPath, pkg);
    console.log(`  ✓ ${pkgPath.replace(ROOT, '')}`);
  }

  // 3. Update CHANGELOG with new version header
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  const changelog = readFileSync(changelogPath, 'utf-8');
  // en-CA da YYYY-MM-DD en hora local; toISOString() daba UTC y de noche adelantaba un día.
  const today = new Date().toLocaleDateString('en-CA');
  const newHeader = `## [${next}] — ${today}`;
  if (changelog.includes(`## [${next}]`)) {
    console.log(`  ⊘ CHANGELOG ya tiene ${next}`);
  } else {
    writeFileSync(changelogPath, rollUnreleased(changelog, newHeader), 'utf-8');
    console.log(`  ✓ CHANGELOG`);
  }

  // 4. Git commit + tag
  try {
    execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
    execSync(`git commit -m "chore(release): v${next}"`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git tag -a v${next} -m "Release v${next}"`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`\n✓ Tag v${next} creado. Para pushear:`);
    console.log(`  git push origin main`);
    console.log(`  git push origin v${next}`);
  } catch (err) {
    console.error('Error en git:', err.message);
    process.exit(1);
  }
}

// Solo corremos main() al invocar el script; importarlo (tests) no dispara nada.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
