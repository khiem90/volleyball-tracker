import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Every icon is the matchbook crest. The install icons put it on the paper
// color; the maskable ones keep it inside the safe zone, the centered
// circle 80% of the icon's width across that every launcher's mask leaves
// visible, so no mask clips it.
const crest = fs.readFileSync(path.join(__dirname, '../public/assets/matchbook/brand/crest.svg'));
const CREST_HEIGHT = 112; // the crest's viewBox height
const PAPER = '#f7f0e4';
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const iconsDir = path.join(__dirname, '../public/icons');
const appDir = path.join(__dirname, '../src/app');

// `crest` is the crest's height as a share of the icon's. The crest is 96
// wide by 112 tall, so at 56% its diagonal is 74% of the icon's width,
// inside the 80% safe zone.
const icons = [
  { name: 'icon-192x192.png', dir: iconsDir, size: 192, crest: 0.8, background: PAPER },
  { name: 'icon-512x512.png', dir: iconsDir, size: 512, crest: 0.8, background: PAPER },
  { name: 'icon-maskable-192x192.png', dir: iconsDir, size: 192, crest: 0.56, background: PAPER },
  { name: 'icon-maskable-512x512.png', dir: iconsDir, size: 512, crest: 0.56, background: PAPER },
  // iOS rounds the corners of these itself and fills transparency with black.
  { name: 'apple-touch-icon.png', dir: iconsDir, size: 180, crest: 0.7, background: PAPER },
  { name: 'apple-icon.png', dir: appDir, size: 180, crest: 0.7, background: PAPER },
  // The favicon is the crest alone, as large as it fits.
  { name: 'icon.png', dir: appDir, size: 32, crest: 1, background: CLEAR },
];

const renderIcon = async ({ size, crest: share, background }) => {
  const height = Math.round(size * share);
  // Rendered at twice the size and scaled down, for clean edges.
  const art = await sharp(crest, { density: Math.ceil((72 * height * 2) / CREST_HEIGHT) })
    .resize({ height })
    .png()
    .toBuffer();
  const { width, height: artHeight } = await sharp(art).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([
      {
        input: art,
        left: Math.round((size - width) / 2),
        top: Math.round((size - artHeight) / 2),
      },
    ])
    .png()
    .toBuffer();
};

const generateIcons = async () => {
  console.log('Generating icons from the matchbook crest...\n');

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
