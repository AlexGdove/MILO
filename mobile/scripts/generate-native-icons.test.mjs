// Тесты генератора Android-иконок: встроенный node:test (без зависимостей), `npm test -w mobile`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  encodePngRect,
  pngSize,
  renderFor,
  renderRound,
  renderSplash,
  SPLASH_BG,
} from './generate-native-icons.mjs';

const pixel = (rgba, width, x, y) =>
  Array.from(rgba.subarray((y * width + x) * 4, (y * width + x) * 4 + 4));

describe('Иконки MILO для Android и iOS', () => {
  it('PNG произвольного размера: сигнатура и размеры в заголовке', () => {
    const png = encodePngRect(Buffer.alloc(30 * 20 * 4), 30, 20);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.deepEqual(pngSize(png), { width: 30, height: 20 });
  });

  it('круглая иконка: углы прозрачные, центр непрозрачный', () => {
    const size = 96;
    const rgba = renderRound(size);
    assert.equal(pixel(rgba, size, 0, 0)[3], 0);
    assert.equal(pixel(rgba, size, size - 1, size - 1)[3], 0);
    assert.equal(pixel(rgba, size, size / 2, size / 2 + 20)[3], 255);
  });

  it('экран запуска: края — фон приложения, в центре — знак', () => {
    const [w, h] = [320, 480];
    const rgba = renderSplash(w, h);
    assert.deepEqual(pixel(rgba, w, 0, 0), [...SPLASH_BG, 255]);
    assert.deepEqual(pixel(rgba, w, w - 1, h - 1), [...SPLASH_BG, 255]);
    // Центр знака (80×80 по центру) — не фон
    assert.notDeepEqual(pixel(rgba, w, w / 2 - 30, h / 2 + 30).slice(0, 3), SPLASH_BG);
  });

  it('файлы ресурсов: какие перерисовываются, какие нет', () => {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      assert.ok(renderFor(name, 48, 48), name);
    }
    assert.ok(renderFor('splash.png', 480, 320));
    assert.equal(renderFor('other.png', 48, 48), null);
  });

  it('адаптивная иконка: фон до краёв (система сама вырезает форму)', () => {
    const size = 108;
    const rgba = renderFor('ic_launcher_foreground.png', size, size);
    assert.equal(pixel(rgba, size, 0, 0)[3], 255);
  });

  it('iOS: иконка без прозрачности (RGB) — иначе App Store отклонит', () => {
    const size = 64;
    const png = encodePngRect(renderFor('AppIcon-512@2x.png', size, size), size, size, {
      alpha: false,
    });
    assert.equal(png[25], 2); // тип цвета в IHDR: 2 = RGB
    assert.deepEqual(pngSize(png), { width: size, height: size });
    // Угол залит цветом знака, а не прозрачен: система сама скругляет
    assert.equal(renderFor('AppIcon-512@2x.png', size, size)[3], 255);
  });

  it('iOS: экраны запуска перерисовываются', () => {
    assert.ok(renderFor('splash-2732x2732-1.png', 100, 100));
  });
});
