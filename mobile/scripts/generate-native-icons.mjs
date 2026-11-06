// Иконки и экраны запуска Android и iOS из знака MILO (тот же рисовальщик, что для PWA:
// frontend/scripts/generate-icons.mjs). Без зависимостей. Заменяет стандартный логотип
// Capacitor в mobile/android/.../res и mobile/ios/App/App/Assets.xcassets; размеры файлов
// берутся из шаблона.
// Запуск: npm run icons -w mobile
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import { renderMark } from '../../frontend/scripts/generate-icons.mjs';

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(MOBILE, 'android', 'app', 'src', 'main', 'res');
const IOS_ASSETS = join(MOBILE, 'ios', 'App', 'App', 'Assets.xcassets');

/** Фон экрана запуска — светлый фон приложения (--color-bg, docs/brand.md). */
export const SPLASH_BG = [0xf4, 0xf5, 0xfa];
/** Фон адаптивной иконки — ультрамарин знака. */
export const ICON_BG_HEX = '#2F3BD9';

/** Ширина и высота PNG из заголовка IHDR. */
export const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

/** Круглая иконка: знак на весь квадрат, снаружи круга — прозрачно (со сглаживанием края). */
export const renderRound = (size) => {
  const rgba = renderMark(size, { fullBleed: true, contentScale: 0.8 });
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      const coverage = Math.max(0, Math.min(1, r - d + 0.5));
      const o = (y * size + x) * 4 + 3;
      rgba[o] = Math.round(rgba[o] * coverage);
    }
  }
  return rgba;
};

/**
 * Экран запуска: фон приложения, по центру — знак (четверть меньшей стороны).
 * Знак накладывается с учётом прозрачности его скруглённых углов.
 */
export const renderSplash = (width, height) => {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = SPLASH_BG[0];
    rgba[i * 4 + 1] = SPLASH_BG[1];
    rgba[i * 4 + 2] = SPLASH_BG[2];
    rgba[i * 4 + 3] = 255;
  }
  const size = Math.round(Math.min(width, height) / 4);
  const mark = renderMark(size);
  const left = Math.round((width - size) / 2);
  const top = Math.round((height - size) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const m = (y * size + x) * 4;
      const a = mark[m + 3] / 255;
      if (a === 0) continue;
      const o = ((top + y) * width + left + x) * 4;
      for (let c = 0; c < 3; c++) rgba[o + c] = Math.round(mark[m + c] * a + rgba[o + c] * (1 - a));
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
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};
/**
 * PNG произвольного размера (в generate-icons.mjs — только квадрат). `alpha: false` — RGB без
 * прозрачности: так требует App Store для иконки (прозрачность отбрасывается, картинка должна
 * быть непрозрачной).
 */
export const encodePngRect = (rgba, width, height, { alpha = true } = {}) => {
  const channels = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * channels + 1);
    raw[row] = 0; // фильтр None
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = row + 1 + x * channels;
      raw[to] = rgba[from];
      raw[to + 1] = rgba[from + 1];
      raw[to + 2] = rgba[from + 2];
      if (alpha) raw[to + 3] = rgba[from + 3];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // глубина цвета
  header[9] = alpha ? 6 : 2; // RGBA / RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** Что рисовать для файла ресурса; `null` — файл не трогаем. */
export const renderFor = (name, width, height) => {
  if (name === 'ic_launcher.png') return renderMark(width);
  if (name === 'ic_launcher_round.png') return renderRound(width);
  // Адаптивная иконка: видна только середина ~66/108 — знак уменьшен, фон до краёв
  if (name === 'ic_launcher_foreground.png') {
    return renderMark(width, { fullBleed: true, contentScale: 0.62 });
  }
  if (name === 'splash.png') return renderSplash(width, height);
  // iOS: иконка 1024 — квадрат до краёв (углы скругляет система), без прозрачности
  if (name.startsWith('AppIcon')) return renderMark(width, { fullBleed: true, contentScale: 0.8 });
  if (name.startsWith('splash-')) return renderSplash(width, height);
  return null;
};

/** Все PNG каталога ресурсов (рекурсивно). */
const pngFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pngFiles(join(dir, entry.name))
      : entry.name.endsWith('.png')
        ? [{ dir, name: entry.name }]
        : [],
  );

/** iOS: Assets.xcassets — иконка и экраны запуска, RGB без прозрачности. */
const generateIos = () => {
  let count = 0;
  for (const { dir, name } of pngFiles(IOS_ASSETS)) {
    const path = join(dir, name);
    const { width, height } = pngSize(readFileSync(path));
    const rgba = renderFor(name, width, height);
    if (!rgba) continue;
    writeFileSync(path, encodePngRect(rgba, width, height, { alpha: false }));
    count++;
  }
  return count;
};

const main = () => {
  let count = 0;
  for (const dir of readdirSync(RES)) {
    if (!dir.startsWith('mipmap') && !dir.startsWith('drawable')) continue;
    for (const name of readdirSync(join(RES, dir))) {
      if (!name.endsWith('.png')) continue;
      const path = join(RES, dir, name);
      const { width, height } = pngSize(readFileSync(path));
      const rgba = renderFor(name, width, height);
      if (!rgba) continue;
      writeFileSync(path, encodePngRect(rgba, width, height));
      count++;
    }
  }
  // Фон адаптивной иконки — цвет знака (под foreground)
  writeFileSync(
    join(RES, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ICON_BG_HEX}</color>\n</resources>\n`,
  );
  console.log(`Android: обновлено ${count} PNG; iOS: ${generateIos()} PNG`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
