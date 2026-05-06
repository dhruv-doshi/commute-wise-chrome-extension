#!/usr/bin/env node
/**
 * Rasterises src/icons/icon.svg → public/icons/icon-{16,32,48,128}.png
 * Run with: node scripts/generate-icons.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('src/icons/icon.svg', 'utf8');
mkdirSync('public/icons', { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  writeFileSync(`public/icons/icon-${size}.png`, png);
  console.log(`  ✓ public/icons/icon-${size}.png (${png.length} bytes)`);
}
