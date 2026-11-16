import type { PhotoMime } from './vision-provider.js';

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * Тип картинки по первым байтам файла, а не по словам клиента: дальше уходит только то,
 * что действительно JPEG, PNG или WebP. Остальное — `null`.
 */
export function detectPhotoMime(bytes: Uint8Array): PhotoMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // RIFF....WEBP
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
}

export type Plan = 'free' | 'plus' | 'unlimited';

/** Тариф с учётом срока оплаты: оплаченный, но истёкший — снова бесплатный. */
export function effectivePlan(plan: Plan, planUntil: Date | null, now: Date): Plan {
  if (plan === 'free') return 'free';
  return planUntil !== null && planUntil <= now ? 'free' : plan;
}
