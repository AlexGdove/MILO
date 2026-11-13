import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

/** Пароль: 8–128 символов (решение №69). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
/**
 * Новый пароль — только латиница, цифры, знаки и пробел (печатные ASCII; просьба владельца
 * 2026-11-13): кириллица в пароле — частая ошибка раскладки, на другом устройстве такой пароль
 * не набрать. Вход это правило не проверяет — старые пароли продолжают работать.
 */
export const PASSWORD_PATTERN = /^[\x20-\x7E]+$/;

/** scrypt: N = 2^15, r = 8, p = 1 (≈32 МБ и десятки мс на хэш) */
const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const DEFAULT_MAXMEM = 64 * 1024 * 1024;
/** Пределы для параметров из сохранённой строки — иначе испорченная строка съест память */
const MAX_N = 1_048_576;
const MAX_R = 32;
const MAX_P = 16;

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const intInRange = (value: string, max: number): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null;
};

/** Хэш пароля: `scrypt$N$r$p$соль$хэш` (соль 16 байт и хэш 64 байта — base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: DEFAULT_MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

/**
 * Пароль совпадает с сохранённым хэшем (сравнение за постоянное время). Испорченная строка или
 * параметры вне пределов — `false`, без исключений.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, rawN, rawR, rawP, rawSalt, rawHash, ...rest] = stored.split('$');
  if (scheme !== 'scrypt' || rest.length > 0 || rawSalt === undefined || rawHash === undefined) {
    return false;
  }
  const n = intInRange(rawN ?? '', MAX_N);
  const r = intInRange(rawR ?? '', MAX_R);
  const p = intInRange(rawP ?? '', MAX_P);
  if (n === null || r === null || p === null) return false;

  const salt = Buffer.from(rawSalt, 'base64url');
  const expected = Buffer.from(rawHash, 'base64url');
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await scryptAsync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: Math.max(DEFAULT_MAXMEM, 256 * n * r),
    });
    return timingSafeEqual(expected, actual);
  } catch {
    // N не степень двойки и прочие отказы scrypt
    return false;
  }
}
