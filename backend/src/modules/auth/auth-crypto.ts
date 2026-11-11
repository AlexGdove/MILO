import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Код входа: 6 цифр. */
export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_PATTERN = /^\d{6}$/;

/** Hex-строка чётной длины — иначе `Buffer.from(…, 'hex')` молча отбросит лишнее. */
const HEX_PATTERN = /^(?:[0-9a-f]{2})*$/i;

/** Новый код входа: 6 цифр из криптографического генератора (с ведущими нулями). */
export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(LOGIN_CODE_LENGTH, '0');
}

/**
 * HMAC-SHA256 кода входа в hex (64 символа). Почта входит в подпись — один код для разных
 * почт даёт разный хэш; без секрета сервера хэш из базы не перебрать (всего 10⁶ кодов).
 */
export function hashLoginCode(email: string, code: string, secret: string): string {
  return createHmac('sha256', secret).update(`${email}:${code}`, 'utf8').digest('hex');
}

/** Сравнение двух hex-строк за постоянное время; не hex или разная длина — `false`. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || !HEX_PATTERN.test(a) || !HEX_PATTERN.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Токен сессии: `ms_` + 32 случайных байта в base64url (43 символа). */
export const SESSION_TOKEN_PREFIX = 'ms_';
export const SESSION_TOKEN_PATTERN = /^ms_[A-Za-z0-9_-]{43}$/;

/** Новый токен сессии: 256 бит из криптографического генератора. */
export function generateSessionToken(): string {
  return `${SESSION_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

/** Строка похожа на токен сессии — проверка до обращения к базе. */
export function isSessionTokenFormat(value: unknown): value is string {
  return typeof value === 'string' && SESSION_TOKEN_PATTERN.test(value);
}

/**
 * SHA-256 токена в hex — только он хранится в базе. Медленный хэш не нужен: у токена
 * 256 бит энтропии (как у ключа устройства, ADR-0001).
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Почта для хранения и сравнения: без пробелов по краям, в нижнем регистре. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
