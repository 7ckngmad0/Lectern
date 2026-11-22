// Draws the Lectern logo (folder + lecture sheet + bookmark on navy) and writes
// every app icon into assets/. No dependencies: a tiny anti-aliased rasterizer + PNG writer.
// Run: node scripts/generate-icons.mjs
// Keep the shapes in sync with src/components/Brand.tsx (same 336-unit coordinates).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(assets, { recursive: true });

const NAVY = '#17213F';
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ── Shapes, in a 336 × 336 design space ────────────────────────────────────
/** Rounded rectangle with per-corner radii [topLeft, topRight, bottomRight, bottomLeft]. */
function rrect(x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  return (px, py) => {
    if (px < x || px > x + w || py < y || py > y + h) return false;
    const corner = (cx, cy, rad, sx, sy) => {
      if (!rad) return true;
      const dx = (px - cx) * sx;
      const dy = (py - cy) * sy;
      return !(dx > 0 && dy > 0 && dx * dx + dy * dy > rad * rad);
    };
    return (
      corner(x + tl, y + tl, tl, -1, -1) &&
      corner(x + w - tr, y + tr, tr, 1, -1) &&
      corner(x + w - br, y + h - br, br, 1, 1) &&
      corner(x + bl, y + h - bl, bl, -1, 1)
    );
  };
}
function polygon(points) {
  return (px, py) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

/** Back to front. `mono` flattens everything to one colour (Android themed icon). */
function glyph({ mono } = {}) {
  const c = (color) => (mono ? [255, 255, 255] : hex(color));
  const layers = [
    { hit: rrect(62, 89, 100, 150, [10, 0, 0, 0]), color: c('#F59E0B') }, // folder back, left tab
    { hit: rrect(190, 111, 85, 130, [0, 10, 0, 0]), color: c('#F59E0B') }, // folder back, right
    { hit: rrect(95, 78, 146, 130, [6, 10, 0, 0]), color: c('#FFFFFF') }, // lecture sheet
    ...(mono
      ? []
      : [
          { hit: rrect(115, 106, 61, 11, 5.5), color: c('#C5CEF0') },
          { hit: rrect(115, 130, 78, 11, 5.5), color: c('#C5CEF0') },
        ]),
    {
      hit: polygon([[201, 78], [231, 78], [231, 128], [216, 116], [201, 128]]), // bookmark
      color: c('#3B5BDB'),
    },
    { hit: rrect(62, 156, 213, 101, [3, 3, 14, 14]), color: c('#FFC145') }, // folder front
  ];
  return layers;
}

// ── Rasterizer ─────────────────────────────────────────────────────────────
/**
 * options.bg: { color, radius } navy tile (radius 0 = full-bleed square), or null for transparent.
 * options.scale: glyph size relative to the 336-unit design space (1 = as in the concept).
 */
function render(size, { bg = null, scale = 1, mono = false } = {}) {
  const s = (size / 336) * scale; // design units → pixels
  const offset = (size - 336 * s) / 2; // centres the glyph
  const layers = scale > 0 ? glyph({ mono }) : [];
  // The navy tile lives in pixel space, independent of the glyph's scale.
  const tile = bg ? rrect(0, 0, size, size, (bg.radius / 336) * size) : null;
  const tileColor = bg ? hex(bg.color) : null;

  const N = size >= 512 ? 3 : 4; // samples per axis
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const x = px + (sx + 0.5) / N;
          const y = py + (sy + 0.5) / N;
          let color = tile && tile(x, y) ? tileColor : null;
          const u = (x - offset) / s;
          const v = (y - offset) / s;
          for (const layer of layers) if (layer.hit(u, v)) color = layer.color;
          if (color) { r += color[0]; g += color[1]; b += color[2]; a += 1; }
        }
      }
      const total = N * N;
      const i = (py * size + px) * 4;
      if (a) {
        out[i] = Math.round(r / a);
        out[i + 1] = Math.round(g / a);
        out[i + 2] = Math.round(b / a);
        out[i + 3] = Math.round((a / total) * 255);
      }
    }
  }
  return out;
}

// ── PNG writer ─────────────────────────────────────────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Output ─────────────────────────────────────────────────────────────────
const jobs = [
  // Store/home-screen icon: full-bleed navy (the OS applies its own corner mask).
  ['icon.png', 1024, { bg: { color: NAVY, radius: 0 } }],
  // Android adaptive icon: glyph inside the safe zone, navy supplied separately.
  ['android-icon-foreground.png', 1024, { scale: 0.8 }],
  ['android-icon-background.png', 1024, { bg: { color: NAVY, radius: 0 }, scale: 0 }],
  ['android-icon-monochrome.png', 1024, { scale: 0.8, mono: true }],
  // Splash + favicon: the rounded tile from the concept, readable on light and dark.
  ['splash-icon.png', 1024, { bg: { color: NAVY, radius: 100 } }],
  ['favicon.png', 96, { bg: { color: NAVY, radius: 100 } }],
];
for (const [name, size, options] of jobs) {
  writeFileSync(join(assets, name), png(size, render(size, options)));
  console.log('wrote', name, `${size}×${size}`);
}
