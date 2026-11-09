import {
  errorFingerprint,
  isNotifyCount,
  normalizeMessage,
  normalizeStack,
} from './fingerprint.js';

const V8_STACK = `TypeError: Cannot read properties of undefined (reading 'name')
    at renderItem (https://milo-app.ru/assets/index-AbC123.js:10:2045)
    at map (<anonymous>)
    at List (https://milo-app.ru/assets/index-AbC123.js:10:3000)`;

describe('normalizeMessage', () => {
  it('заменяет числа и id, чтобы одинаковые ошибки совпали', () => {
    expect(normalizeMessage('Product 42 not found')).toBe('Product # not found');
    expect(normalizeMessage('No item 0f8fad5b-d9cb-469f-a165-70867728950e')).toBe('No item <id>');
  });

  it('обрезает длинный текст', () => {
    expect(normalizeMessage('x'.repeat(500))).toHaveLength(200);
  });
});

describe('normalizeStack', () => {
  it('убирает адрес сайта и позицию в файле (формат V8)', () => {
    expect(normalizeStack(V8_STACK)).toBe(
      'at renderItem (/assets/index-AbC123.js|at map (<anonymous>)|at List (/assets/index-AbC123.js',
    );
  });

  it('понимает формат Safari / Firefox', () => {
    expect(normalizeStack('render@https://milo-app.ru/assets/a.js:1:2\nmap@[native code]')).toBe(
      'render@/assets/a.js|map@[native code]',
    );
  });

  it('нет стека — пустая строка', () => {
    expect(normalizeStack(undefined)).toBe('');
    expect(normalizeStack('')).toBe('');
  });
});

describe('errorFingerprint', () => {
  const base = { kind: 'error', message: 'Boom 1', stack: V8_STACK, appVersion: '1.1.2' };

  it('одинаковая ошибка при сдвиге строк и других числах в тексте — тот же отпечаток', () => {
    const shifted = V8_STACK.replace(':10:2045', ':11:99');
    expect(errorFingerprint({ ...base, message: 'Boom 7', stack: shifted })).toBe(
      errorFingerprint(base),
    );
  });

  it('другая версия приложения — другой отпечаток', () => {
    expect(errorFingerprint({ ...base, appVersion: '1.1.3' })).not.toBe(errorFingerprint(base));
  });

  it('другой вид или другой текст — другой отпечаток', () => {
    expect(errorFingerprint({ ...base, kind: 'render' })).not.toBe(errorFingerprint(base));
    expect(errorFingerprint({ ...base, message: 'Other' })).not.toBe(errorFingerprint(base));
  });

  it('это sha256 в шестнадцатеричном виде (64 символа)', () => {
    expect(errorFingerprint(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('isNotifyCount', () => {
  it('сообщает о первой ошибке и степенях десяти, остальное молчит', () => {
    expect([1, 2, 9, 10, 11, 99, 100, 101, 1000, 10000].map(isNotifyCount)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
    ]);
  });
});
