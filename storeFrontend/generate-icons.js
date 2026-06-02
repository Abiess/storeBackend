/**
 * PWA Icon Generator für markt.ma
 * Erstellt alle benötigten Icons ohne externe Dependencies.
 * Design: Lila-Gradient #667eea → #764ba2 mit weißem "M"
 *
 * Ausführen: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [72, 96, 128, 192, 512];
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'icons');

// ── PNG helpers ──────────────────────────────────────────────────────────────

function u32be(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = u32be(data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcBytes = u32be(crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crcBytes]);
}

/**
 * Bilinear-interpolierter Lila-Gradient (links-oben → rechts-unten)
 * von #667eea nach #764ba2
 */
function gradientColor(x, y, size) {
  const t = (x + y) / (2 * (size - 1));
  const r = Math.round(0x66 + t * (0x76 - 0x66));
  const g = Math.round(0x7e + t * (0x4b - 0x7e));
  const b = Math.round(0xea + t * (0xa2 - 0xea));
  return [r, g, b];
}

/** Prüft ob ein Pixel innerhalb des abgerundeten Rechtecks liegt (radius = size*0.2) */
function inRoundedRect(x, y, size) {
  const r = size * 0.2;
  const cx = Math.max(r, Math.min(size - 1 - r, x));
  const cy = Math.max(r, Math.min(size - 1 - r, y));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Einfache Bitmap-Schrift für "M" (7×9 Pixel) */
const M_BITMAP = [
  [1,0,0,0,0,0,1],
  [1,1,0,0,0,1,1],
  [1,1,1,0,1,1,1],
  [1,0,1,1,1,0,1],
  [1,0,0,1,0,0,1],
  [1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1],
];

/** Gibt true zurück wenn (px,py) im skalierten "M" liegt */
function inLetter(px, py, size) {
  const glyphW = 7;
  const glyphH = 9;
  const scale = Math.floor(size * 0.45 / glyphH);
  if (scale < 1) return false;

  const totalW = glyphW * scale;
  const totalH = glyphH * scale;
  const offX = Math.floor((size - totalW) / 2);
  const offY = Math.floor((size - totalH) / 2);

  const lx = px - offX;
  const ly = py - offY;
  if (lx < 0 || lx >= totalW || ly < 0 || ly >= totalH) return false;

  const col = Math.floor(lx / scale);
  const row = Math.floor(ly / scale);
  return M_BITMAP[row][col] === 1;
}

function generatePng(size) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data (filter byte 0 per row + 3 bytes per pixel)
  const rawSize = size * (1 + size * 3);
  const raw = Buffer.allocUnsafe(rawSize);
  let pos = 0;

  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter None
    for (let x = 0; x < size; x++) {
      if (!inRoundedRect(x, y, size)) {
        // Transparent → white background fallback
        raw[pos++] = 255;
        raw[pos++] = 255;
        raw[pos++] = 255;
      } else if (inLetter(x, y, size)) {
        raw[pos++] = 255;
        raw[pos++] = 255;
        raw[pos++] = 255;
      } else {
        const [r, g, b] = gradientColor(x, y, size);
        raw[pos++] = r;
        raw[pos++] = g;
        raw[pos++] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const size of SIZES) {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  const png = generatePng(size);
  fs.writeFileSync(filepath, png);
  console.log(`✅  ${filename} (${png.length} Bytes)`);
}

console.log('\n🎉  Alle Icons wurden erfolgreich generiert!');
console.log(`📂  Pfad: ${OUTPUT_DIR}`);

