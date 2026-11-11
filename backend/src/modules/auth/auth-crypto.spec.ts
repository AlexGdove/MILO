import {
  generateLoginCode,
  generateSessionToken,
  hashLoginCode,
  hashSessionToken,
  isSessionTokenFormat,
  LOGIN_CODE_PATTERN,
  normalizeEmail,
  safeEqualHex,
  SESSION_TOKEN_PATTERN,
} from './auth-crypto.js';

describe('Криптография аккаунтов', () => {
  it('generateLoginCode возвращает корректные коды и они уникальны в массиве', () => {
    const codes = Array.from({ length: 200 }, generateLoginCode);
    expect(codes.every((code) => LOGIN_CODE_PATTERN.test(code))).toBe(true);
    expect(new Set(codes).size).toBeGreaterThan(1);
  });

  it('hashLoginCode возвращает 64 hex-символа, детерминирован и чувствителен к параметрам', () => {
    const emailA = 'a@example.com';
    const emailB = 'b@example.com';
    const codeA = '123456';
    const codeB = '654321';
    const secretA = 's1';
    const secretB = 's2';

    const hash = hashLoginCode(emailA, codeA, secretA);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashLoginCode(emailA, codeA, secretA)).toBe(hash);

    expect(hashLoginCode(emailB, codeA, secretA)).not.toBe(hash);
    expect(hashLoginCode(emailA, codeB, secretA)).not.toBe(hash);
    expect(hashLoginCode(emailA, codeA, secretB)).not.toBe(hash);
  });

  it('safeEqualHex сравнивает строки корректно и безопасно', () => {
    expect(safeEqualHex('ab12', 'ab12')).toBe(true);
    expect(safeEqualHex('AB12', 'ab12')).toBe(true);
    expect(safeEqualHex('ab12', 'ab13')).toBe(false);
    expect(safeEqualHex('ab12', 'ab')).toBe(false);
    expect(() => safeEqualHex('zz', 'zz')).not.toThrow();
  });

  it('safeEqualHex: не hex и нечётная длина — false (Buffer молча отбросил бы хвост)', () => {
    expect(safeEqualHex('abc', 'abd')).toBe(false);
    expect(safeEqualHex('zz', 'zz')).toBe(false);
    expect(safeEqualHex('', '')).toBe(true);
  });

  it('generateSessionToken возвращает валидный токен и они различаются', () => {
    const first = generateSessionToken();
    const second = generateSessionToken();
    expect(first).toMatch(SESSION_TOKEN_PATTERN);
    expect(second).toMatch(SESSION_TOKEN_PATTERN);
    expect(first).not.toBe(second);
  });

  it('isSessionTokenFormat корректно определяет тип', () => {
    expect(isSessionTokenFormat(generateSessionToken())).toBe(true);
    expect(isSessionTokenFormat(`mk_${'A'.repeat(43)}`)).toBe(false);
    expect(isSessionTokenFormat(42)).toBe(false);
    expect(isSessionTokenFormat(`ms_${'a'.repeat(42)}`)).toBe(false);
  });

  it('hashSessionToken возвращает 64 hex-символа и детерминирован', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it('normalizeEmail убирает пробелы и приводит к нижнему регистру', () => {
    expect(normalizeEmail('  User.Name+Tag@Example.COM ')).toBe('user.name+tag@example.com');
  });
});
