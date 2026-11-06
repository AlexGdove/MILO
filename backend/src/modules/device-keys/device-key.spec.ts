import {
  DEVICE_KEY_PATTERN,
  generateDeviceKey,
  hashDeviceKey,
  isDeviceKeyFormat,
} from './device-key.js';

describe('ключ устройства', () => {
  it('ключ начинается с mk_, длина 46 и подходит под шаблон', () => {
    const key = generateDeviceKey();
    expect(key.startsWith('mk_')).toBe(true);
    expect(key).toHaveLength(46);
    expect(key).toMatch(DEVICE_KEY_PATTERN);
  });

  it('100 ключей подряд — все разные', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateDeviceKey()));
    expect(keys.size).toBe(100);
  });

  it('выданный ключ проходит проверку формата', () => {
    expect(isDeviceKeyFormat(generateDeviceKey())).toBe(true);
  });

  it.each([
    ['пустая строка', ''],
    ['только префикс', 'mk_'],
    ['чужой префикс', `xx_${'a'.repeat(43)}`],
    ['короче на символ', `mk_${'a'.repeat(42)}`],
    ['длиннее на символ', `mk_${'a'.repeat(44)}`],
    ['символ не из base64url', `mk_${'a'.repeat(42)}+`],
    ['число', 123],
    ['undefined', undefined],
  ])('формат отклоняет: %s', (_name, value) => {
    expect(isDeviceKeyFormat(value)).toBe(false);
  });

  it('хэш — 64 hex-символа и не содержит сам ключ', () => {
    const hash = hashDeviceKey('mk_test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('mk_test');
  });

  it('хэш детерминирован, у разных ключей — разный', () => {
    expect(hashDeviceKey('mk_test1')).toBe(hashDeviceKey('mk_test1'));
    expect(hashDeviceKey('mk_test1')).not.toBe(hashDeviceKey('mk_test2'));
  });
});
