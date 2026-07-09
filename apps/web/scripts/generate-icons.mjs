/**
 * Script para generar los iconos de la PWA desde el sigilo SVG.
 * Lee `public/sigil.svg` y produce PNGs en `public/icons/`:
 *   - icon-192.png       (192x192)
 *   - icon-512.png       (512x512)
 *   - icon-maskable.png  (512x512 con padding para Android adaptive)
 *   - apple-touch-icon.png (180x180)
 *
 * Uso: node scripts/generate-icons.mjs
 * Dep: sharp (ya en devDependencies)
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const SIGIL = join(ROOT, 'public', 'sigil.svg');
const OUT_DIR = join(ROOT, 'public', 'icons');

async function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const svg = readFileSync(SIGIL);
  const svgBuffer = Buffer.from(svg);

  const targets = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of targets) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png()
      .toFile(join(OUT_DIR, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Maskable: 512x512 con padding 10% (área segura central)
  const maskableSize = 512;
  const safeArea = Math.round(maskableSize * 0.7); // 70% del canvas
  const innerSvg = await sharp(svgBuffer)
    .resize(safeArea, safeArea, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: innerSvg, gravity: 'center' }])
    .png()
    .toFile(join(OUT_DIR, 'icon-maskable.png'));
  console.log(`✓ icon-maskable.png (${maskableSize}x${maskableSize}, safe area 70%)`);
}

main().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
