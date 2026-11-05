// Генератор иконок MILO (PNG + ICO) без зависимостей: только node:zlib и node:fs.
// Геометрия знака — docs/brand.md: квадрат 48×48 с радиусом 12, строчная «м» из двух арок и точка.
// Запуск: npm run icons -w frontend  →  файлы в frontend/public/
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SUPERSAMPLE = 4; // 4×4 выборки на пиксель — сглаживание краёв

const COLORS = {
  bg: [0x2f, 0x3b, 0xd9],
  letter: [0xff, 0xff, 0xff],
  accent: [0x3c, 0xcb, 0x9a],
};

/**
 * Строчная «м» в координатах 48×48 — то же, что путь в shared/ui/Logo:
 * M13 34V24.5 a5.5 5.5 0 0 1 11 0 V34 M24 24.5 a5.5 5.5 0 0 1 11 0 V34, обводка 4.6 со скруглёнными концами.
 * Обводка = все точки на расстоянии ≤ половины толщины от осевой линии.
 */
const STROKE_HALF = 4.6 / 2;
const LETTER_SEGMENTS = [
  [13, 24.5, 13, 34],
  [24, 24.5, 24, 34],
  [35, 24.5, 35, 34],
];
/** Верхние полуокружности арок (дуги идут через верх, y меньше центра). */
const LETTER_ARCS = [
  { cx: 18.5, cy: 24.5, r: 5.5 },
  { cx: 29.5, cy: 24.5, r: 5.5 },
];
const DOT = { cx: 36.5, cy: 13.5, r: 3.3 };

const distToSegment = (px, py, [x1, y1, x2, y2]) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

const distToUpperArc = (px, py, { cx, cy, r }) => {
  // Над центром ближайшая точка дуги — по радиусу; ниже — один из концов дуги
  if (py <= cy) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  return Math.min(Math.hypot(px - (cx - r), py - cy), Math.hypot(px - (cx + r), py - cy));
};

const insideLetter = (px, py) =>
  LETTER_SEGMENTS.some((s) => distToSegment(px, py, s) <= STROKE_HALF) ||
  LETTER_ARCS.some((a) => distToUpperArc(px, py, a) <= STROKE_HALF);

const insideDot = (px, py) => Math.hypot(px - DOT.cx, py - DOT.cy) <= DOT.r;

/** Цвет содержимого знака в точке или null (фон). */
const contentColor = (px, py) => {
  if (insideDot(px, py)) return COLORS.accent;
  if (insideLetter(px, py)) return COLORS.letter;
  return null;
};

const insideRoundRect = (px, py, { x, y, w, h, r }) => {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};

/**
 * Растеризует знак.
 * @param {number} size итоговый размер в px
 * @param {{ fullBleed?: boolean, contentScale?: number }} options
 *   fullBleed — фон на весь квадрат без скругления (maskable, apple-touch: ОС скругляет сама);
 *   contentScale — масштаб «м» и точки относительно центра (для safe-zone maskable).
 * @returns {Buffer} RGBA
 */
export const renderMark = (size, { fullBleed = false, contentScale = 1 } = {}) => {
  const rgba = Buffer.alloc(size * size * 4);
  const unit = 48 / size;
  const bgShape = { x: 0, y: 0, w: 48, h: 48, r: fullBleed ? 0 : 12 };
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) * unit;
          const y = (py + (sy + 0.5) / SUPERSAMPLE) * unit;
          if (!insideRoundRect(x, y, bgShape)) continue;
          // Обратное масштабирование точки к центру — содержимое уменьшается на contentScale
          const bx = 24 + (x - 24) / contentScale;
          const by = 24 + (y - 24) / contentScale;
          const color = contentColor(bx, by) ?? COLORS.bg;
          r += color[0];
          g += color[1];
          b += color[2];
          covered++;
        }
      }
      const o = (py * size + px) * 4;
      if (covered > 0) {
        // Цвет — среднее по покрытым выборкам, прозрачность — доля покрытия (сглаженный край фона)
        rgba[o] = Math.round(r / covered);
        rgba[o + 1] = Math.round(g / covered);
        rgba[o + 2] = Math.round(b / covered);
        rgba[o + 3] = Math.round((covered / samples) * 255);
      }
    }
  }
  return rgba;
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** Кодирует RGBA в PNG (8 бит, цвет + альфа). */
export const encodePng = (rgba, size) => {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // фильтр None
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // глубина
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

/** Собирает ICO из PNG-изображений (формат с PNG внутри поддерживается всеми современными браузерами). */
export const encodeIco = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // тип: иконка
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // плоскости
    entry.writeUInt16LE(32, 6); // бит на пиксель
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
};

const png = (size, options) => encodePng(renderMark(size, options), size);

const main = () => {
  mkdirSync(OUT_DIR, { recursive: true });
  /** Maskable и apple-touch: фон на весь квадрат, «м» и точка в безопасной зоне (круг 80%). */
  const maskable = { fullBleed: true, contentScale: 0.8 };
  const files = {
    'pwa-192x192.png': png(192),
    'pwa-512x512.png': png(512),
    'maskable-512x512.png': png(512, maskable),
    'apple-touch-icon.png': png(180, maskable),
    'favicon-64.png': png(64),
    'favicon.ico': encodeIco([16, 32, 48].map((size) => ({ size, png: png(size) }))),
  };
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(join(OUT_DIR, name), data);
    console.log(`${name.padEnd(22)} ${data.length} B`);
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
