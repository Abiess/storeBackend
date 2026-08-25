/**
 * Einfacher SVG→PNG Konverter mit sharp
 * Generiert markt.ma PWA Icons aus logo.svg
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGO_SVG = path.join(__dirname, 'src', 'assets', 'images', 'logo.svg');
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'icons');

const ICONS = [
  { name: 'icon-192x192.png', size: 192, padding: 10 },
  { name: 'icon-512x512.png', size: 512, padding: 10 },
  { name: 'icon-512x512-maskable.png', size: 512, padding: 40 },
  { name: 'apple-touch-icon.png', size: 180, padding: 10 }
];

console.log('╔════════════════════════════════════════════╗');
console.log('║  markt.ma SVG → PNG Konverter             ║');
console.log('╚════════════════════════════════════════════╝\n');

// Prüfe ob logo.svg existiert
if (!fs.existsSync(LOGO_SVG)) {
  console.error(`❌ Logo nicht gefunden: ${LOGO_SVG}`);
  process.exit(1);
}

console.log(`✅ Logo gefunden: ${path.relative(process.cwd(), LOGO_SVG)}\n`);

// Installiere sharp temporär falls nicht vorhanden
console.log('📦 Installiere sharp temporär...');
try {
  execSync('npm install --no-save sharp', { stdio: 'ignore' });
  console.log('   ✅ sharp verfügbar\n');
} catch (error) {
  console.error('   ❌ sharp Installation fehlgeschlagen');
  process.exit(1);
}

// Importiere sharp
const sharp = require('sharp');

// Konvertiere Icons
(async () => {
  for (const config of ICONS) {
    const { name, size, padding } = config;
    const outputPath = path.join(OUTPUT_DIR, name);
    
    // Berechne Logo-Größe mit Padding
    const paddingPercent = padding;
    const logoSize = Math.round(size * (100 - paddingPercent) / 100);
    const offset = Math.round((size - logoSize) / 2);
    
    const isMaskable = name.includes('maskable');
    const badge = isMaskable ? ` [40% Safe Area 🛡️]` : '';
    
    console.log(`⏳ ${name} (${size}×${size}, ${padding}% Padding${badge})...`);
    
    try {
      await sharp(LOGO_SVG)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .extend({
          top: offset,
          bottom: offset,
          left: offset,
          right: offset,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      const stats = fs.statSync(outputPath);
      const kb = (stats.size / 1024).toFixed(2);
      const timestamp = stats.mtime.toISOString().substring(0, 19).replace('T', ' ');
      
      console.log(`   ✅ ${name} (${kb} KB, ${timestamp})`);
      
    } catch (error) {
      console.error(`   ❌ Fehler: ${error.message}`);
      process.exit(1);
    }
  }
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  ✅ Alle Icons erfolgreich konvertiert!   ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log('📦 Generierte Icons:\n');
  for (const config of ICONS) {
    const filepath = path.join(OUTPUT_DIR, config.name);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      const kb = (stats.size / 1024).toFixed(2);
      const hash = require('crypto').createHash('md5').update(fs.readFileSync(filepath)).digest('hex').substring(0, 8);
      console.log(`   ✅ ${config.name.padEnd(30)} ${kb.padStart(7)} KB  Hash: ${hash}`);
    }
  }
  
  console.log('\n💡 Nächster Schritt: npm run build ausführen\n');
  
})();
