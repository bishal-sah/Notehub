/**
 * Generate PWA PNG icons from SVG using Node.js canvas-free approach.
 * Creates minimal valid PNG files with the NoteHub brand color.
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);

  // CRC32
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  crc ^= 0xFFFFFFFF;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuf]);
}

function isInRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return dist(x, y, r, r) <= r;
  if (x >= w - r && y < r) return dist(x, y, w - r - 1, r) <= r;
  if (x < r && y >= h - r) return dist(x, y, r, h - r - 1) <= r;
  if (x >= w - r && y >= h - r) return dist(x, y, w - r - 1, h - r - 1) <= r;
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function isInBookIcon(x, y, w, h) {
  // Simple book/open-book shape in center
  const cx = w / 2;
  const cy = h / 2;
  const scale = w / 512;

  // Book dimensions
  const bookW = 200 * scale;
  const bookH = 180 * scale;
  const top = cy - bookH / 2;
  const bottom = cy + bookH / 2;
  const left = cx - bookW / 2;
  const right = cx + bookW / 2;
  const spine = cx;
  const thickness = 4 * scale;

  // Left page
  if (x >= left && x <= spine - 2 * scale && y >= top && y <= bottom) {
    // Top edge, bottom edge, left edge, or spine
    if (y <= top + thickness || y >= bottom - thickness ||
        x <= left + thickness || x >= spine - 3 * scale) {
      return true;
    }
    // Horizontal lines (text lines)
    const lineSpacing = 20 * scale;
    const lineStart = left + 15 * scale;
    const lineEnd = spine - 15 * scale;
    for (let ly = top + 25 * scale; ly < bottom - 20 * scale; ly += lineSpacing) {
      if (y >= ly && y <= ly + 2 * scale && x >= lineStart && x <= lineEnd) {
        return true;
      }
    }
  }

  // Right page
  if (x >= spine + 2 * scale && x <= right && y >= top && y <= bottom) {
    if (y <= top + thickness || y >= bottom - thickness ||
        x >= right - thickness || x <= spine + 3 * scale) {
      return true;
    }
    const lineSpacing = 20 * scale;
    const lineStart = spine + 15 * scale;
    const lineEnd = right - 15 * scale;
    for (let ly = top + 25 * scale; ly < bottom - 20 * scale; ly += lineSpacing) {
      if (y >= ly && y <= ly + 2 * scale && x >= lineStart && x <= lineEnd) {
        return true;
      }
    }
  }

  return false;
}

function createPNGSync(size) {
  const width = size;
  const height = size;
  const r = 99, g = 102, b = 241;
  const rawData = Buffer.alloc(height * (1 + width * 4));
  const radius = Math.floor(size * 0.18);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const inRect = isInRoundedRect(x, y, width, height, radius);
      if (inRect) {
        const inBook = isInBookIcon(x, y, width, height);
        if (inBook) {
          rawData[px] = 255; rawData[px+1] = 255; rawData[px+2] = 255; rawData[px+3] = 255;
        } else {
          rawData[px] = r; rawData[px+1] = g; rawData[px+2] = b; rawData[px+3] = 255;
        }
      } else {
        rawData[px] = 0; rawData[px+1] = 0; rawData[px+2] = 0; rawData[px+3] = 0;
      }
    }
  }

  const compressed = deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const ihdr = createChunk('IHDR', ihdrData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const publicDir = resolve(__dirname, '../public');

const sizes = [192, 512];
for (const size of sizes) {
  const png = createPNGSync(size);
  const outPath = resolve(publicDir, `pwa-${size}x${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Created pwa-${size}x${size}.png (${png.length} bytes)`);
}

// Also create apple-touch-icon (180x180)
const apple = createPNGSync(180);
writeFileSync(resolve(publicDir, 'apple-touch-icon.png'), apple);
console.log(`Created apple-touch-icon.png (${apple.length} bytes)`);

console.log('Done!');
