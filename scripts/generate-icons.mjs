import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Every icon is one of the three crest drawings in public/brand. A new crest
// is three new files there and one run of this script: node scripts/generate-icons.mjs
//   crest.svg           the full mark, for the install icons
//   crest-small.svg     the cut without fine detail, for 32px and under
//   crest-maskable.svg  the crest in white on a full green square, kept inside
//                       the safe zone, the centered circle 80% of the icon's
//                       width across that every launcher's mask leaves visible
const brandDir = path.join(__dirname, '../public/brand');
const art = {
  full: fs.readFileSync(path.join(brandDir, 'crest.svg')),
  small: fs.readFileSync(path.join(brandDir, 'crest-small.svg')),
  maskable: fs.readFileSync(path.join(brandDir, 'crest-maskable.svg')),
};
const CREST_SIZE = 100; // each drawing's viewBox, a square
const SURFACE = '#ffffff'; // the surface token in src/app/globals.css
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const iconsDir = path.join(__dirname, '../public/icons');
const appDir = path.join(__dirname, '../src/app');

// `share` is the drawing's width as a share of the icon's.
const icons = [
  { name: 'icon-192x192.png', dir: iconsDir, size: 192, art: 'full', share: 0.72, background: SURFACE },
  { name: 'icon-512x512.png', dir: iconsDir, size: 512, art: 'full', share: 0.72, background: SURFACE },
  // The maskable drawing brings its own green ground, so it fills the icon.
  { name: 'icon-maskable-192x192.png', dir: iconsDir, size: 192, art: 'maskable', share: 1, background: CLEAR },
  { name: 'icon-maskable-512x512.png', dir: iconsDir, size: 512, art: 'maskable', share: 1, background: CLEAR },
  // iOS rounds the corners of these itself and fills transparency with black.
  { name: 'apple-touch-icon.png', dir: iconsDir, size: 180, art: 'full', share: 0.72, background: SURFACE },
  { name: 'apple-icon.png', dir: appDir, size: 180, art: 'full', share: 0.72, background: SURFACE },
  // The favicon is the small cut alone, as large as it fits.
  { name: 'icon.png', dir: appDir, size: 32, art: 'small', share: 1, background: CLEAR },
];

const renderIcon = async ({ size, art: drawing, share, background }) => {
  const side = Math.round(size * share);
  // Rendered at twice the size and scaled down, for clean edges.
  const crest = await sharp(art[drawing], { density: Math.ceil((72 * side * 2) / CREST_SIZE) })
    .resize({ width: side, height: side })
    .png()
    .toBuffer();
  const inset = Math.round((size - side) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: crest, left: inset, top: inset }])
    .png()
    .toBuffer();
};

const generateIcons = async () => {
  console.log('Generating icons from public/brand...\n');

  for (const icon of icons) {
    fs.writeFileSync(path.join(icon.dir, icon.name), await renderIcon(icon));
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }

  // favicon.ico is the 32x32 PNG under the old name; browsers read either.
  fs.copyFileSync(path.join(appDir, 'icon.png'), path.join(appDir, 'favicon.ico'));
  console.log('Generated: favicon.ico (32x32)');
};

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
