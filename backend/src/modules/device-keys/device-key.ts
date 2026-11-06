import { createHash, randomBytes } from 'node:crypto';

/** Ключ устройства (ADR-0001): `mk_` + 32 случайных байта в base64url (43 символа). */
export const DEVICE_KEY_HEADER = 'x-device-key';
export const DEVICE_KEY_PREFIX = 'mk_';
export const DEVICE_KEY_BYTES = 32;
export const DEVICE_KEY_PATTERN = /^mk_[A-Za-z0-9_-]{43}$/;

/** Новый ключ: 256 бит из криптографического генератора. */
export function generateDeviceKey(): string {
  return `${DEVICE_KEY_PREFIX}${randomBytes(DEVICE_KEY_BYTES).toString('base64url')}`;
}

/** Строка похожа на ключ — проверка до обращения к базе. */
export function isDeviceKeyFormat(value: unknown): value is string {
  return typeof value === 'string' && DEVICE_KEY_PATTERN.test(value);
}

/**
 * SHA-256 ключа в hex (64 символа) — только он хранится в базе. Медленный хэш не нужен:
 * у ключа 256 бит энтропии, подбор невозможен (ADR-0001).
 */
export function hashDeviceKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}
