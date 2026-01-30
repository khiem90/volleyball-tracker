const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceIcon = path.join(__dirname, '../public/icons/tournament icon.png');
const outputDir = path.join(__dirname, '../public/icons');
const appDir = path.join(__dirname, '../src/app');

const sizes = [
  { name: 'icon-192x192.png', size: 192, dir: outputDir },
  { name: 'icon-512x512.png', size: 512, dir: outputDir },
  { name: 'icon-maskable-192x192.png', size: 192, dir: outputDir },
  { name: 'icon-maskable-512x512.png', size: 512, dir: outputDir },
  { name: 'apple-touch-icon.png', size: 180, dir: outputDir },
  // Next.js 13+ supports icon.png in app folder for favicon
  { name: 'icon.png', size: 32, dir: appDir },
  { name: 'apple-icon.png', size: 180, dir: appDir },
  // Favicon sizes for ICO generation
  { name: 'favicon-16.png', size: 16, dir: outputDir, temp: true },
  { name: 'favicon-32.png', size: 32, dir: outputDir, temp: true },
  { name: 'favicon-48.png', size: 48, dir: outputDir, temp: true },
];

const generateIcons = async () => {
  console.log('Generating PWA icons from source-icon.svg...\n');

  for (const { name, size, dir, temp } of sizes) {
    const outputPath = path.join(dir, name);

    await sharp(sourceIcon)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(outputPath);

    if (!temp) {
      console.log(`Generated: ${name} (${size}x${size})`);
    }
  }

  // Generate favicon.ico (copy 32x32 PNG - modern browsers handle this)
  console.log('\nGenerating favicon.ico...');
  fs.copyFileSync(path.join(appDir, 'icon.png'), path.join(appDir, 'favicon.ico'));
  console.log('Generated: favicon.ico (32x32)');

  // Clean up temp files
  fs.unlinkSync(path.join(outputDir, 'favicon-16.png'));
  fs.unlinkSync(path.join(outputDir, 'favicon-32.png'));
  fs.unlinkSync(path.join(outputDir, 'favicon-48.png'));

  console.log('\nAll icons generated successfully!');
};

generateIcons().catch(console.error);
