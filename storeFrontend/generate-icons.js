/**
 * PWA Icon Generator für markt.ma
 * Erstellt PNG Icons aus dem offiziellen logo.svg
 * Verwendet sharp via npx (keine permanente Dependency)
 *
 * Ausführen: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LOGO_PATH = path.join(__dirname, 'src', 'assets', 'images', 'logo.svg');
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'icons');

// Icon-Konfigurationen (Name, Größe, Padding-Prozent)
const ICONS = [
  { name: 'icon-192x192.png', size: 192, padding: 10 },        // Standard any
  { name: 'icon-512x512.png', size: 512, padding: 10 },        // High-res any
  { name: 'icon-512x512-maskable.png', size: 512, padding: 40 }, // Maskable (40% Safe Area!)
  { name: 'apple-touch-icon.png', size: 180, padding: 10 }     // iOS Retina
];

/**
 * Generiert ein Icon mit sharp (via npx direkter Aufruf)
 */
async function generateIcon(config) {
  return new Promise((resolve, reject) => {
    const { name, size, padding } = config;
    const outputPath = path.join(OUTPUT_DIR, name);
    
    // Berechne Logo-Größe mit Padding
    const paddingPercent = padding;
    const logoSize = Math.round(size * (100 - paddingPercent) / 100);
    const offset = Math.round((size - logoSize) / 2);
    
    const isMaskable = name.includes('maskable');
    const paddingInfo = isMaskable ? ` ${paddingPercent}% Safe Area 🛡️` : '';
    
    console.log(`⏳ ${name} (${size}x${size}, ${paddingPercent}% Padding${paddingInfo})...`);
    
    // Erstelle temporäres Node.js-Skript für sharp
    const tempScript = `
const { execSync } = require('child_process');
const fs = require('fs');

// Nutze npx sharp-cli direkt
const logoPath = '${LOGO_PATH.replace(/\\/g, '\\\\')}';
const outputPath = '${outputPath.replace(/\\/g, '\\\\')}';

try {
  // Schritt 1: Resize mit sharp-cli
  const resizedTemp = outputPath + '.temp.png';
  
  // sharp-cli: resize mit contain (behält Aspect-Ratio)
  execSync(\`npx --yes sharp-cli resize ${logoSize} ${logoSize} --fit contain --background white -i "\${logoPath}" -o "\${resizedTemp}"\`, {
    stdio: 'inherit'
  });
  
  // Schritt 2: Extend mit Padding
  execSync(\`npx --yes sharp-cli extend ${offset} ${offset} ${offset} ${offset} --background white -i "\${resizedTemp}" -o "\${outputPath}"\`, {
    stdio: 'inherit'
  });
  
  // Lösche temp-Datei
  try { fs.unlinkSync(resizedTemp); } catch(e) {}
  
  process.exit(0);
} catch (error) {
  console.error('Fehler:', error.message);
  process.exit(1);
}
`;
    
    const tempFile = path.join(__dirname, `.temp-icon-${Date.now()}.js`);
    fs.writeFileSync(tempFile, tempScript);
    
    // Führe temp-Script aus
    const proc = spawn('node', [tempFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      cwd: __dirname
    });
    
    let output = '';
    proc.stdout.on('data', data => output += data.toString());
    proc.stderr.on('data', data => output += data.toString());
    
    proc.on('close', (code) => {
      // Lösche temp-Datei
      try { fs.unlinkSync(tempFile); } catch(e) {}
      
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        const kb = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ${name} erstellt (${kb} KB)`);
        resolve();
      } else {
        console.error(`   ❌ Fehler: ${output}`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  markt.ma PWA Icon Generator              ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  // Prüfe ob Logo existiert
  if (!fs.existsSync(LOGO_PATH)) {
    console.error(`❌ Logo nicht gefunden: ${LOGO_PATH}`);
    process.exit(1);
  }
  
  console.log(`📁 Quelle: ${path.relative(__dirname, LOGO_PATH)}`);
  console.log(`📂 Ziel:   ${path.relative(__dirname, OUTPUT_DIR)}\n`);
  
  // Erstelle Output-Verzeichnis
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  try {
    // Generiere alle Icons sequenziell
    for (const icon of ICONS) {
      await generateIcon(icon);
    }
    
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  ✨ Alle Icons erfolgreich generiert!    ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    console.log('📦 Generierte Dateien:\n');
    ICONS.forEach(icon => {
      const filepath = path.join(OUTPUT_DIR, icon.name);
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        const kb = (stats.size / 1024).toFixed(2);
        const maskable = icon.name.includes('maskable') ? ' [MASKABLE]' : '';
        const apple = icon.name.includes('apple') ? ' [iOS]' : '';
        console.log(`   ✅ ${icon.name.padEnd(30)} ${kb.padStart(7)} KB${maskable}${apple}`);
      }
    });
    
    console.log('\n💡 Nächste Schritte:');
    console.log('   1. manifest.webmanifest aktualisieren');
    console.log('   2. index.html apple-touch-icon setzen');
    console.log('   3. theme_color auf #12C99B ändern');
    console.log('   4. npm run build ausführen\n');
    
  } catch (error) {
    console.error('\n❌ Fehler beim Generieren:', error.message);
    process.exit(1);
  }
})();

