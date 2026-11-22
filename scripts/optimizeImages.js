import fs from 'fs';
import path from 'path';

async function run() {
  const sharp = (await import('sharp')).default;
  console.log('Optimizing images with Sharp...');

  const targets = [
    {
      src: 'public/assets/images/harmonia_coastal_sunset_hero_1793899947684.jpg',
      dest: 'public/assets/images/harmonia_coastal_sunset_hero.webp',
      maxWidth: 1920,
      quality: 82,
    },
    {
      src: 'public/assets/aistudio/RIT_Logo_copy.jpg_df27acb0.jpeg',
      dest: 'public/assets/aistudio/rit_logo.webp',
      maxWidth: 300,
      quality: 85,
    },
    {
      src: 'public/assets/aistudio/WhatsApp_Image_2026-11-05_at_9.55.36_PM_6702fc40.jpeg',
      dest: 'public/assets/aistudio/harmonia_logo.webp',
      maxWidth: 300,
      quality: 85,
    },
    {
      src: 'public/assets/aistudio/d9390228dd804b94b88b8e40fd379e17_11206b80.jpg',
      dest: 'public/assets/aistudio/ieee_logo.webp',
      maxWidth: 240,
      quality: 85,
    },
    {
      src: 'public/assets/aistudio/WhatsApp_Image_2026-11-05_at_6.38.06_PM_0bcd0555.jpeg',
      dest: 'public/assets/aistudio/idatamind_logo.webp',
      maxWidth: 240,
      quality: 85,
    },
    {
      src: 'public/assets/aistudio/WhatsApp_Image_2026-11-05_at_9.51.19_PM_10200bbf.jpeg',
      dest: 'public/assets/aistudio/harmonia_poster.webp',
      maxWidth: 1200,
      quality: 82,
    },
  ];

  for (const t of targets) {
    if (fs.existsSync(t.src)) {
      const origSize = fs.statSync(t.src).size;
      await sharp(t.src)
        .resize({ width: t.maxWidth, withoutEnlargement: true })
        .webp({ quality: t.quality })
        .toFile(t.dest);
      const newSize = fs.statSync(t.dest).size;
      const saved = Math.round((1 - newSize / origSize) * 100);
      console.log(`✓ ${path.basename(t.dest)}: ${(origSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (${saved}% saved)`);
    }
  }
  console.log('All images optimized successfully!');
}

run().catch(console.error);
