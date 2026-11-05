import { describe, expect, it } from 'vitest';

import { encodeIco, encodePng, renderMark } from './generate-icons.mjs';

const pixel = (buf, size, x, y) => {
  const o = (y * size + x) * 4;
  return [buf[o], buf[o + 1], buf[o + 2], buf[o + 3]];
};

describe('generate-icons', () => {
  it('возвращает RGBA нужного размера', () => {
    const rgba = renderMark(48);
    expect(rgba.length).toBe(48 * 48 * 4);
  });

  it('угол прозрачен, центр фона — ультрамарин', () => {
    const rgba = renderMark(48);
    expect(pixel(rgba, 48, 0, 0)[3]).toBe(0);
    expect(pixel(rgba, 48, 24, 6)).toEqual([47, 59, 217, 255]);
  });

  // Требование изменилось 2026-11-05 (решение №22): вместо трёх столбиков — «м» из двух арок и точка
  it('три ножки «м» белые', () => {
    const rgba = renderMark(48);
    for (const x of [12, 23, 34]) {
      expect(pixel(rgba, 48, x, 30)).toEqual([255, 255, 255, 255]);
    }
  });

  it('арки «м» белые сверху, под аркой — фон', () => {
    const rgba = renderMark(48);
    expect(pixel(rgba, 48, 18, 18)).toEqual([255, 255, 255, 255]); // вершина левой арки
    expect(pixel(rgba, 48, 29, 18)).toEqual([255, 255, 255, 255]); // вершина правой арки
    expect(pixel(rgba, 48, 18, 28)).toEqual([47, 59, 217, 255]); // просвет под левой аркой
    expect(pixel(rgba, 48, 12, 12)).toEqual([47, 59, 217, 255]); // над «м» — фон
  });

  it('точка справа сверху — мятная', () => {
    const rgba = renderMark(48);
    expect(pixel(rgba, 48, 36, 13)).toEqual([60, 203, 154, 255]);
  });

  it('fullBleed закрашивает углы', () => {
    const rgba = renderMark(48, { fullBleed: true });
    expect(pixel(rgba, 48, 0, 0)).toEqual([47, 59, 217, 255]);
  });

  it('encodePng пишет сигнатуру и размеры', () => {
    const buf = encodePng(renderMark(16), 16);
    expect(buf.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(buf.readUInt32BE(16)).toBe(16);
    expect(buf.readUInt32BE(20)).toBe(16);
  });

  it('encodeIco собирает заголовок и записи', () => {
    const a = encodePng(renderMark(16), 16);
    const b = encodePng(renderMark(32), 32);
    const ico = encodeIco([
      { size: 16, png: a },
      { size: 32, png: b },
    ]);
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect(ico[6]).toBe(16);
    expect(ico[6 + 16]).toBe(32);
    expect(ico.readUInt32LE(6 + 8)).toBe(a.length);
    expect(ico.readUInt32LE(6 + 12)).toBe(6 + 32);
    expect(ico.readUInt32LE(6 + 16 + 12)).toBe(6 + 32 + a.length);
    expect(ico.length).toBe(6 + 32 + a.length + b.length);
  });
});
