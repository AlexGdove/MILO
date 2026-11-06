// Тесты версии MILO (node:test): `npm test` в корне запускает их вместе с тестами workspaces.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyToGradle, applyToXcode, buildNumber, bumpPatch, parseVersion } from './version.mjs';

describe('версия MILO (решение №48)', () => {
  it('новая функция — +1 к последней цифре', () => {
    assert.equal(bumpPatch('1.0.0'), '1.0.1');
    assert.equal(bumpPatch('1.0.9'), '1.0.10');
    assert.equal(bumpPatch('1.2.3'), '1.2.4');
  });

  it('номер сборки только растёт вместе с версией', () => {
    assert.equal(buildNumber('1.0.0'), 10000);
    assert.equal(buildNumber('1.0.1'), 10001);
    assert.equal(buildNumber('1.2.3'), 10203);
    assert.ok(buildNumber('1.0.10') > buildNumber('1.0.9'));
    assert.ok(buildNumber('1.1.0') > buildNumber('1.0.99'));
  });

  it('неверная версия — ошибка', () => {
    for (const bad of ['1.0', 'v1.0.0', '1.0.0-beta', '1.100.0']) {
      assert.throws(() => parseVersion(bad), bad);
    }
    assert.throws(() => bumpPatch('1.0.99'));
  });

  it('Android: versionName и versionCode', () => {
    const gradle = 'defaultConfig {\n  versionCode 1\n  versionName "1.0"\n}';
    assert.equal(
      applyToGradle(gradle, '1.0.1'),
      'defaultConfig {\n  versionCode 10001\n  versionName "1.0.1"\n}',
    );
  });

  it('iOS: все конфигурации получают версию и номер сборки', () => {
    const pbx =
      'MARKETING_VERSION = 1.0;\nCURRENT_PROJECT_VERSION = 1;\nMARKETING_VERSION = 1.0;\n';
    const out = applyToXcode(pbx, '1.0.0');
    assert.equal(out.match(/MARKETING_VERSION = 1\.0\.0;/g)?.length, 2);
    assert.match(out, /CURRENT_PROJECT_VERSION = 10000;/);
  });
});
